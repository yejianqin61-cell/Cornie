import { ApiError, createAbortContext, createHttpError, normalizeFetchError, raceWithAbort } from '../request.js'
import { API_BASE, apiFetch } from './shared.js'

export async function sendMessage(message, date) {
  return apiFetch('/conversations', {
    method: 'POST',
    body: JSON.stringify({ message, date }),
  })
}

// 454：流式对话（SSE）。逐块回调 delta 文本，返回最终结果。
// 第三个可选参数 { signal, timeoutMs }：支持外部取消与超时（默认 30s，同 apiFetch）；
// 取消/超时后读取循环立即退出且不再回调 onDelta。
// 错误统一归一化：非 2xx → ApiError('http')；kind:'error' 事件 / 流提前结束 → ApiError('protocol')。
export async function streamConversation({ message, date }, onDelta, { signal, timeoutMs } = {}) {
  const ctx = createAbortContext({ signal, timeoutMs })

  let reader = null
  let buffer = ''
  let result = null
  let sawDone = false

  const handleEvent = (event) => {
    if (event?.kind === 'delta' && typeof event.text === 'string') {
      onDelta?.(event.text)
    } else if (event?.kind === 'done') {
      sawDone = true
      result = event.result
    } else if (event?.kind === 'error') {
      throw new ApiError('protocol', event.error || 'stream conversation error')
    }
  }

  try {
    const response = await raceWithAbort(
      fetch(`${API_BASE}/conversations/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, date }),
        signal: ctx.signal,
      }),
      ctx
    )

    if (!response.ok) {
      throw await createHttpError(response)
    }

    reader = response.body?.getReader()
    if (!reader) {
      throw new ApiError('protocol', 'stream response has no readable body')
    }

    const decoder = new TextDecoder()

    async function readChunk() {
      const { done, value } = await raceWithAbort(reader.read(), ctx)
      if (done) return false
      buffer += decoder.decode(value, { stream: true })

      let newlineIndex
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data) continue

        let event
        try {
          event = JSON.parse(data)
        } catch {
          // 坏行跳过不抛，仅丢弃
          continue
        }
        handleEvent(event)
      }
      return true
    }

    while (await readChunk()) {
      // drain
    }

    // 半截行：缓冲区尾部无换行的残留内容。
    // 含完整 data: 前缀则尝试解析为事件；解析失败或非 data: 行则丢弃。
    const tail = buffer.trim()
    if (tail && tail.startsWith('data:')) {
      const data = tail.slice(5).trim()
      if (data) {
        try {
          handleEvent(JSON.parse(data))
        } catch {
          // 残留无法解析 → 丢弃
        }
      }
    }

    // 服务端在收到 done 事件前关闭连接 → 流被非预期中断
    if (!sawDone) {
      throw new ApiError('protocol', 'stream ended prematurely')
    }

    return result
  } catch (err) {
    throw normalizeFetchError(err, ctx, timeoutMs)
  } finally {
    ctx.cleanup()
  }
}

export async function getConversation(date) {
  return apiFetch(`/conversations/${encodeURIComponent(date)}`)
}

export async function deleteConversation(date) {
  return apiFetch(`/conversations/${encodeURIComponent(date)}`, { method: 'DELETE' })
}

export async function listChatlogDates({ month, scope, query, limit, cursor } = {}) {
  const params = new URLSearchParams()
  if (month) params.set('month', month)
  if (scope) params.set('scope', scope)
  if (query) params.set('q', query)
  if (limit !== undefined) params.set('limit', String(limit))
  if (cursor !== undefined && cursor !== null) params.set('cursor', String(cursor))
  const qs = params.toString()
  const data = await apiFetch(`/chatlogs${qs ? `?${qs}` : ''}`)
  return {
    ...data,
    entries: Array.isArray(data?.entries) ? data.entries : [],
    availableMonths: Array.isArray(data?.availableMonths) ? data.availableMonths : [],
    pagination: data?.pagination || { cursor: '0', nextCursor: null, hasMore: false, pageSize: 100, total: 0 },
    filters: data?.filters || { scope: scope || 'all', month: month || '', query: query || '' },
    archiveScope: data?.archiveScope || {
      scope: scope || 'all',
      month: month || '',
      recentFromDate: '',
      recentToDate: '',
    },
    searchMeta: data?.searchMeta || { query: query || '', mode: query ? 'keyword' : 'browse' },
    storage: data?.storage || data?.meta?.storage || { driver: 'unknown', queryContractVersion: 1 },
    meta: data?.meta || { responseType: 'chatlog_history_list' },
  }
}

export async function searchChatlogMessageSnippets({ keyword, month, scope, limit, cursor } = {}) {
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  if (month) params.set('month', month)
  if (scope) params.set('scope', scope)
  if (limit !== undefined) params.set('limit', String(limit))
  if (cursor !== undefined && cursor !== null) params.set('cursor', String(cursor))
  const qs = params.toString()
  const data = await apiFetch(`/chatlogs/search/snippets${qs ? `?${qs}` : ''}`)
  return {
    ...data,
    items: Array.isArray(data?.items) ? data.items : [],
    filters: data?.filters || { scope: scope || 'all', month: month || '' },
    pagination: data?.pagination || { cursor: '0', nextCursor: null, hasMore: false, pageSize: 100, total: 0 },
    storage: data?.storage || data?.meta?.storage || { driver: 'unknown', queryContractVersion: 1 },
    meta: data?.meta || { responseType: 'chatlog_message_snippet_search' },
  }
}

export async function getChatlog(date, { limit, cursor, query, beforeId, mode, signal } = {}) {
  const params = new URLSearchParams()
  if (limit !== undefined) params.set('limit', String(limit))
  if (cursor !== undefined && cursor !== null) params.set('cursor', String(cursor))
  if (query) params.set('q', query)
  if (beforeId) params.set('beforeId', beforeId)
  if (mode) params.set('mode', mode)
  const qs = params.toString()
  const data = await apiFetch(`/chatlogs/${encodeURIComponent(date)}${qs ? `?${qs}` : ''}`, { signal })
  const normalizedItems = Array.isArray(data?.items) ? data.items : []
  const normalizedMessages = Array.isArray(data?.messages) ? data.messages : normalizedItems
  const normalizedPagination = data?.pagination || {
    cursor: data?.context?.currentCursor || '0',
    nextCursor: data?.nextCursor ?? null,
    hasMore: data?.hasMore === true,
    pageSize: data?.context?.pageSize || limit || 100,
    total: data?.context?.total || normalizedMessages.length,
  }
  return {
    ...data,
    items: normalizedItems,
    messages: normalizedMessages,
    context: data?.context || null,
    pagination: normalizedPagination,
    meta: data?.meta || { responseType: mode === 'page' ? 'chatlog_day_page' : 'chatlog_day_record' },
    storage: data?.storage || data?.meta?.storage || { driver: 'unknown', queryContractVersion: 1 },
  }
}

export async function exportChatlogByDate(date, { format = 'json' } = {}) {
  const params = new URLSearchParams()
  if (format) params.set('format', format)
  const qs = params.toString()
  const data = await apiFetch(`/chatlogs/${encodeURIComponent(date)}/export${qs ? `?${qs}` : ''}`)
  return {
    ...data,
    meta: data?.meta || { responseType: 'chatlog_day_export' },
  }
}

export async function exportChatlogByMonth(month, { format = 'json' } = {}) {
  const params = new URLSearchParams()
  if (format) params.set('format', format)
  const qs = params.toString()
  const data = await apiFetch(`/chatlogs/export/month/${encodeURIComponent(month)}${qs ? `?${qs}` : ''}`)
  return {
    ...data,
    meta: data?.meta || { responseType: 'chatlog_month_export' },
  }
}
