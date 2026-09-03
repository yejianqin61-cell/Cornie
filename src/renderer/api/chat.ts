import { ApiError, createAbortContext, createHttpError, normalizeFetchError, raceWithAbort } from '../request'
import { API_BASE, apiFetch } from './shared'

// ── 会话（含 SSE 流式） ──

export interface ConversationResult {
  reply?: string
  [key: string]: unknown
}

export type StreamEvent =
  | { kind: 'delta'; text: string }
  | { kind: 'done'; result: ConversationResult | null }
  | { kind: 'error'; error?: string }

export async function sendMessage(message: string, date: string): Promise<ConversationResult> {
  return apiFetch<ConversationResult>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ message, date }),
  })
}

// 454：流式对话（SSE）。逐块回调 delta 文本，返回最终结果。
// 第三个可选参数 { signal, timeoutMs }：支持外部取消与超时（默认 30s，同 apiFetch）；
// 取消/超时后读取循环立即退出且不再回调 onDelta。
// 错误统一归一化：非 2xx → ApiError('http')；kind:'error' 事件 / 流提前结束 → ApiError('protocol')。
export async function streamConversation(
  { message, date }: { message: string; date: string },
  onDelta?: (text: string) => void,
  { signal, timeoutMs }: { signal?: AbortSignal | null; timeoutMs?: number } = {}
): Promise<ConversationResult | null> {
  const ctx = createAbortContext({ signal, timeoutMs })

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let buffer = ''
  let result: ConversationResult | null = null
  let sawDone = false

  const handleEvent = (event: StreamEvent) => {
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

    reader = response.body?.getReader() ?? null
    if (!reader) {
      throw new ApiError('protocol', 'stream response has no readable body')
    }

    const decoder = new TextDecoder()

    async function readChunk(): Promise<boolean> {
      const { done, value } = await raceWithAbort(reader!.read(), ctx)
      if (done) return false
      buffer += decoder.decode(value, { stream: true })

      let newlineIndex = buffer.indexOf('\n')
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data) continue

        let event: StreamEvent
        try {
          event = JSON.parse(data) as StreamEvent
        } catch {
          // 坏行跳过不抛，仅丢弃
          continue
        }
        handleEvent(event)
        newlineIndex = buffer.indexOf('\n')
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
          handleEvent(JSON.parse(data) as StreamEvent)
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

export async function getConversation(date: string): Promise<ConversationResult> {
  return apiFetch<ConversationResult>(`/conversations/${encodeURIComponent(date)}`)
}

export async function deleteConversation(date: string): Promise<unknown> {
  return apiFetch(`/conversations/${encodeURIComponent(date)}`, { method: 'DELETE' })
}

// ── 聊天记录（chatlogs）──

export interface ChatlogPagination {
  cursor: string
  nextCursor: string | null
  hasMore: boolean
  pageSize: number
  total: number
}

export type ChatlogListPagination = ChatlogPagination

export interface ChatlogListFilters {
  scope: string
  month: string
  query?: string
}

export interface ChatlogListEntry {
  [key: string]: unknown
}

export interface ChatlogListResult {
  entries: ChatlogListEntry[]
  availableMonths: string[]
  pagination: ChatlogListPagination
  filters: ChatlogListFilters
  archiveScope: { scope: string; month: string; recentFromDate: string; recentToDate: string }
  searchMeta: { query: string; mode: string }
  storage: { driver: string; queryContractVersion: number }
  meta: { responseType: string }
  [key: string]: unknown
}

export interface ChatlogListQuery {
  month?: string
  scope?: string
  query?: string
  limit?: number
  cursor?: string | number | null
}

const DEFAULT_PAGINATION: ChatlogListPagination = {
  cursor: '0',
  nextCursor: null,
  hasMore: false,
  pageSize: 100,
  total: 0,
}

export async function listChatlogDates({
  month,
  scope,
  query,
  limit,
  cursor,
}: ChatlogListQuery = {}): Promise<ChatlogListResult> {
  const params = new URLSearchParams()
  if (month) params.set('month', month)
  if (scope) params.set('scope', scope)
  if (query) params.set('q', query)
  if (limit !== undefined) params.set('limit', String(limit))
  if (cursor !== undefined && cursor !== null) params.set('cursor', String(cursor))
  const qs = params.toString()
  const data = await apiFetch<Partial<ChatlogListResult>>(`/chatlogs${qs ? `?${qs}` : ''}`)
  return {
    ...data,
    entries: Array.isArray(data?.entries) ? data.entries : [],
    availableMonths: Array.isArray(data?.availableMonths) ? data.availableMonths : [],
    pagination: data?.pagination || { ...DEFAULT_PAGINATION },
    filters: data?.filters || { scope: scope || 'all', month: month || '', query: query || '' },
    archiveScope: data?.archiveScope || {
      scope: scope || 'all',
      month: month || '',
      recentFromDate: '',
      recentToDate: '',
    },
    searchMeta: data?.searchMeta || { query: query || '', mode: query ? 'keyword' : 'browse' },
    storage: data?.storage ||
      (data as { meta?: { storage?: { driver: string; queryContractVersion: number } } })?.meta?.storage || {
        driver: 'unknown',
        queryContractVersion: 1,
      },
    meta: data?.meta || { responseType: 'chatlog_history_list' },
  } as ChatlogListResult
}

export interface SnippetSearchResult {
  items: Array<Record<string, unknown>>
  filters: { scope: string; month: string }
  pagination: ChatlogListPagination
  storage: { driver: string; queryContractVersion: number }
  meta: { responseType: string }
  [key: string]: unknown
}

export async function searchChatlogMessageSnippets({
  keyword,
  month,
  scope,
  limit,
  cursor,
}: {
  keyword?: string
  month?: string
  scope?: string
  limit?: number
  cursor?: string | number | null
} = {}): Promise<SnippetSearchResult> {
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  if (month) params.set('month', month)
  if (scope) params.set('scope', scope)
  if (limit !== undefined) params.set('limit', String(limit))
  if (cursor !== undefined && cursor !== null) params.set('cursor', String(cursor))
  const qs = params.toString()
  const data = await apiFetch<Partial<SnippetSearchResult>>(`/chatlogs/search/snippets${qs ? `?${qs}` : ''}`)
  return {
    ...data,
    items: Array.isArray(data?.items) ? data.items : [],
    filters: data?.filters || { scope: scope || 'all', month: month || '' },
    pagination: data?.pagination || { ...DEFAULT_PAGINATION },
    storage: data?.storage ||
      (data as { meta?: { storage?: { driver: string; queryContractVersion: number } } })?.meta?.storage || {
        driver: 'unknown',
        queryContractVersion: 1,
      },
    meta: data?.meta || { responseType: 'chatlog_message_snippet_search' },
  } as SnippetSearchResult
}

export interface ChatlogDayResult {
  items: Array<Record<string, unknown>>
  messages: Array<Record<string, unknown>>
  context: Record<string, unknown> | null
  pagination: ChatlogListPagination
  meta: { responseType: string }
  storage: { driver: string; queryContractVersion: number }
  [key: string]: unknown
}

export async function getChatlog(
  date: string,
  {
    limit,
    cursor,
    query,
    beforeId,
    mode,
    signal,
  }: {
    limit?: number
    cursor?: string | number | null
    query?: string
    beforeId?: string
    mode?: string
    signal?: AbortSignal | null
  } = {}
): Promise<ChatlogDayResult> {
  const params = new URLSearchParams()
  if (limit !== undefined) params.set('limit', String(limit))
  if (cursor !== undefined && cursor !== null) params.set('cursor', String(cursor))
  if (query) params.set('q', query)
  if (beforeId) params.set('beforeId', beforeId)
  if (mode) params.set('mode', mode)
  const qs = params.toString()
  const data = await apiFetch<Record<string, unknown>>(`/chatlogs/${encodeURIComponent(date)}${qs ? `?${qs}` : ''}`, {
    signal,
  })
  const normalizedItems = Array.isArray(data?.items) ? data.items : []
  const normalizedMessages = Array.isArray(data?.messages) ? data.messages : normalizedItems
  const context = (data?.context ?? null) as Record<string, unknown> | null
  const pagination: ChatlogListPagination = (data?.pagination as ChatlogListPagination) || {
    cursor: String((context as { currentCursor?: unknown } | null)?.currentCursor ?? '0'),
    nextCursor: (data?.nextCursor ?? null) as string | null,
    hasMore: data?.hasMore === true,
    pageSize: Number((context as { pageSize?: unknown } | null)?.pageSize) || limit || 100,
    total: Number((context as { total?: unknown } | null)?.total) || normalizedMessages.length,
  }
  return {
    ...data,
    items: normalizedItems,
    messages: normalizedMessages,
    context,
    pagination,
    meta: (data?.meta as { responseType: string }) || {
      responseType: mode === 'page' ? 'chatlog_day_page' : 'chatlog_day_record',
    },
    storage: (data?.storage as { driver: string; queryContractVersion: number }) ||
      (data?.meta as { storage?: { driver: string; queryContractVersion: number } })?.storage || {
        driver: 'unknown',
        queryContractVersion: 1,
      },
  } as ChatlogDayResult
}

export async function exportChatlogByDate(
  date: string,
  { format = 'json' }: { format?: string } = {}
): Promise<{ meta: { responseType: string }; [key: string]: unknown }> {
  const params = new URLSearchParams()
  if (format) params.set('format', format)
  const qs = params.toString()
  const data = await apiFetch<Record<string, unknown>>(
    `/chatlogs/${encodeURIComponent(date)}/export${qs ? `?${qs}` : ''}`
  )
  return {
    ...data,
    meta: (data?.meta as { responseType: string }) || { responseType: 'chatlog_day_export' },
  } as { meta: { responseType: string }; [key: string]: unknown }
}

export async function exportChatlogByMonth(
  month: string,
  { format = 'json' }: { format?: string } = {}
): Promise<{ meta: { responseType: string }; [key: string]: unknown }> {
  const params = new URLSearchParams()
  if (format) params.set('format', format)
  const qs = params.toString()
  const data = await apiFetch<Record<string, unknown>>(
    `/chatlogs/export/month/${encodeURIComponent(month)}${qs ? `?${qs}` : ''}`
  )
  return {
    ...data,
    meta: (data?.meta as { responseType: string }) || { responseType: 'chatlog_month_export' },
  } as { meta: { responseType: string }; [key: string]: unknown }
}
