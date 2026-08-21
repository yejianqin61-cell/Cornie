// 请求层工具：超时、Abort 合并、错误分类。
// api.js 与其上层（FE-03/04/05 等）复用，页面统一从本模块拿到结构化错误。
//
// 导出：
//   DEFAULT_TIMEOUT_MS —— 默认超时时长（30s，模块级常量，允许调用方覆盖）
//   ApiError            —— 结构化错误 { name, kind, status?, message, cause? }
//   isAbortError        —— 判断原生 AbortError（外部取消）
//   createAbortContext  —— 合并外部 signal 与内部超时定时器的 Abort 上下文
//   raceWithAbort       —— promise 与「合并 signal 中止」赛跑，中止即以 AbortError 拒绝
//   createHttpError     —— 从非 2xx Response 构造 ApiError('http')
//   normalizeFetchError —— 任意 fetch/读取异常归一化为 ApiError / 原生 AbortError
//   request             —— 带超时/取消/错误分类的 fetch 封装，返回已通过 ok 校验的 Response

export const DEFAULT_TIMEOUT_MS = 30_000

/**
 * 结构化请求错误。
 * kind: 'network' | 'timeout' | 'http' | 'protocol'
 * 保留 name/message 可读性，页面现有 catch (e) { e.message } 用法继续可用。
 */
export class ApiError extends Error {
  constructor(kind, message, { status, cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    if (status !== undefined) this.status = status
    if (cause !== undefined) this.cause = cause
  }
}

/** 判断是否为原生 AbortError（外部主动取消）。 */
export function isAbortError(err) {
  return err?.name === 'AbortError'
}

/**
 * 合并外部 AbortSignal 与内部超时定时器。
 * 返回 { signal, timedOut(), externalAborted(), cleanup() }：
 * - signal：合并后的 AbortSignal，任一来源触发都会中止；
 * - timedOut()：true 表示本次中止由超时引起；
 * - externalAborted()：true 表示外部 signal 已中止；
 * - cleanup()：请求结束后调用，释放外部监听与超时定时器。
 */
export function createAbortContext({ signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController()
  let timedOut = false
  let externalAborted = false
  let timer = null

  const onExternalAbort = () => {
    externalAborted = true
    controller.abort(signal?.reason)
  }

  if (signal) {
    if (signal.aborted) {
      externalAborted = true
      controller.abort(signal.reason)
    } else {
      signal.addEventListener('abort', onExternalAbort, { once: true })
    }
  }

  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    externalAborted: () => externalAborted,
    cleanup() {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      if (signal) signal.removeEventListener('abort', onExternalAbort)
    }
  }
}

/**
 * 把 promise 与「合并 signal 中止」赛跑：
 * - signal 中止时立即以原生 AbortError 拒绝（即使 fetch/reader 忽略 signal）；
 * - 返回的 promise 在任一来源先到者处结算，并清理监听（不产生未处理拒绝）。
 */
export function raceWithAbort(promise, ctx) {
  let abortReject
  const abortPromise = new Promise((_, reject) => {
    abortReject = reject
  })
  const onAbort = () => {
    abortReject(new DOMException('The operation was aborted.', 'AbortError'))
  }
  if (ctx.signal.aborted) {
    onAbort()
  } else {
    ctx.signal.addEventListener('abort', onAbort, { once: true })
  }
  return Promise.race([promise, abortPromise]).finally(() => {
    ctx.signal.removeEventListener('abort', onAbort)
  })
}

/**
 * 从非 2xx 响应构造 http 分类错误。
 * message 优先级：响应体 JSON.error → 响应体文本 → `HTTP ${status}`。
 */
export async function createHttpError(res) {
  const status = res.status
  let message = `HTTP ${status}`
  try {
    const text = await res.text()
    if (text) {
      try {
        const parsed = JSON.parse(text)
        message =
          parsed && typeof parsed.error === 'string' && parsed.error
            ? parsed.error
            : text
      } catch {
        message = text
      }
    }
  } catch {
    // 响应体不可读，保留 `HTTP ${status}`
  }
  return new ApiError('http', message, { status })
}

/**
 * 归一化请求层异常：
 * - ApiError（http/protocol 等已分类错误）原样返回；
 * - 超时 → ApiError('timeout')；
 * - 外部取消 → 原生 AbortError（由调用方静默处理）；
 * - 其余（fetch TypeError / 连接拒绝等）→ ApiError('network')。
 */
export function normalizeFetchError(err, ctx, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (err instanceof ApiError) return err
  if (ctx?.timedOut?.()) {
    return new ApiError('timeout', `request timed out after ${timeoutMs}ms`, { cause: err })
  }
  if (isAbortError(err) || ctx?.externalAborted?.()) {
    return err && typeof err === 'object'
      ? err
      : new DOMException('The operation was aborted.', 'AbortError')
  }
  return new ApiError('network', describeNetworkFailure(err), { cause: err })
}

/** 从任意被抛出的值提取可读的网络失败描述（Error.message 或原始字符串）。 */
function describeNetworkFailure(err) {
  const detail =
    err && typeof err === 'object'
      ? err.message || 'unknown error'
      : typeof err === 'string'
        ? err
        : 'unknown error'
  return `network request failed: ${detail}`
}

/**
 * 带超时 / 外部取消 / 错误分类的 fetch 封装。
 * - 默认超时 DEFAULT_TIMEOUT_MS，可用 { timeoutMs } 覆盖；
 * - 外部取消经 { signal } 透传合并，抛原生 AbortError；
 * - 非 2xx 抛 ApiError('http')（message 取自响应体）；
 * - 返回已通过 ok 校验的 Response，由调用方读取 body。
 */
export async function request(url, init = {}, { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const ctx = createAbortContext({ signal, timeoutMs })
  try {
    const res = await raceWithAbort(fetch(url, { ...init, signal: ctx.signal }), ctx)
    if (!res.ok) throw await createHttpError(res)
    return res
  } catch (err) {
    throw normalizeFetchError(err, ctx, timeoutMs)
  } finally {
    ctx.cleanup()
  }
}
