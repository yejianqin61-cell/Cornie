// DeepSeek 云端模型客户端（BE-09 统一版）。
// - 单一请求封装：非流式/流式共用 headers/错误映射/超时/外部取消 signal；
// - chatStream 支持网络层指数退避重试（仅请求建立阶段，避免流式内容重复）；
// - SSE 记录是否收到 [DONE]：EOF 未见 [DONE] 返回 finishReason 'incomplete'（调用方决定回退）。

import { assertModelConfigured, getModelConfig } from '../config.js'

function withTimeout(timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer)
  }
}

function mergeSignals(signals) {
  const valid = signals.filter(Boolean)
  if (valid.length === 0) return undefined
  if (valid.length === 1) return valid[0]
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(valid)
  // 兜底：无 AbortSignal.any 时取第一个（超时优先）
  return valid[0]
}

/** 统一请求封装：返回已通过 ok 校验的 Response。 */
async function deepseekRequest(path, payload, { timeoutMs, externalSignal, timeoutErrorCode = 'timeout' } = {}) {
  const config = assertModelConfigured()
  const { signal: timeoutSignal, clear } = withTimeout(timeoutMs ?? config.timeoutMs)

  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: mergeSignals([timeoutSignal, externalSignal])
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const error = new Error(`DeepSeek ${res.status}: ${text}`)
      error.code = `http_${res.status}`
      throw error
    }

    return res
  } catch (error) {
    if (error?.name === 'AbortError') {
      const aborted = externalSignal?.aborted === true
      const abortError = new Error(aborted ? 'DeepSeek request aborted' : 'DeepSeek request timed out')
      abortError.code = aborted ? 'aborted' : timeoutErrorCode
      throw abortError
    }
    throw error
  } finally {
    clear()
  }
}

function isRetryableRequestError(error) {
  if (error?.name === 'TypeError') return true // 网络层失败（fetch 抛）
  if (typeof error?.code === 'string' && /^http_(429|5\d\d)$/.test(error.code)) return true
  return false
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function chat({ messages, model, temperature = 0.8, maxTokens = 512, timeoutMs, signal }) {
  const config = getModelConfig()
  const res = await deepseekRequest(
    '/chat/completions',
    {
      model: model || config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    },
    { timeoutMs, externalSignal: signal }
  )
  const data = await res.json()

  return {
    content: data?.choices?.[0]?.message?.content || '',
    finishReason: data?.choices?.[0]?.finish_reason || null,
    usage: data?.usage || null
  }
}

export async function generate({ prompt, model, temperature = 0.7, maxTokens = 300, timeoutMs, signal }) {
  return chat({
    model,
    temperature,
    maxTokens,
    timeoutMs,
    signal,
    messages: [{ role: 'user', content: prompt }]
  })
}

export async function checkHealth() {
  const config = getModelConfig()
  if (!config.apiKey) {
    return {
      ok: false,
      provider: config.provider,
      configured: false,
      model: config.model,
      reason: 'missing_api_key'
    }
  }

  return {
    ok: true,
    provider: config.provider,
    configured: true,
    model: config.model
  }
}

// 454：流式对话（SSE）。逐块回调 delta 文本；tool_call 等结构化输出不在本通道内流式。
// BE-09：支持外部 signal（{ signal } 第三参）；请求建立阶段网络/5xx 指数退避重试；
// EOF 未见 [DONE] 返回 finishReason 'incomplete'（不再把截断当完整回复）。
export async function chatStream({ messages, model, temperature = 0.7, maxTokens = 512, timeoutMs }, onDelta, { signal } = {}) {
  if (typeof onDelta !== 'function') {
    throw new Error('chatStream requires an onDelta callback')
  }

  const config = assertModelConfigured()
  const maxAttempts = 3 // 初始 + 2 次指数退避重试
  let lastError = null

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let res
    try {
      res = await deepseekRequest(
        '/chat/completions',
        {
          model: model || config.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true
        },
        { timeoutMs, externalSignal: signal, timeoutErrorCode: 'stream_timeout' }
      )
    } catch (error) {
      lastError = error
      if (!isRetryableRequestError(error) || attempt >= maxAttempts - 1) {
        throw error
      }
      await delay(200 * 2 ** attempt)
      continue
    }

    // SSE 读取阶段不做重试（避免流式内容重复）；记录是否收到 [DONE]。
    let content = ''
    let sawDone = false
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let newlineIndex
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim()
          buffer = buffer.slice(newlineIndex + 1)
          if (!line.startsWith('data:')) continue

          const data = line.slice(5).trim()
          if (data === '[DONE]') {
            sawDone = true
            break
          }

          if (!data) continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              content += delta
              onDelta(delta)
            }
          } catch {
            // 单行解析失败：跳过不中断（心跳/注释等非数据行在此前已被过滤）
          }
        }
      }

      return { content, finishReason: sawDone ? 'stop' : 'incomplete', usage: null }
    } catch (error) {
      if (error?.name === 'AbortError') {
        const aborted = signal?.aborted === true
        const abortError = new Error(aborted ? 'DeepSeek stream aborted' : 'DeepSeek stream timed out')
        abortError.code = aborted ? 'aborted' : 'stream_timeout'
        throw abortError
      }
      throw error
    }
  }

  throw lastError ?? new Error('chatStream failed unexpectedly')
}
