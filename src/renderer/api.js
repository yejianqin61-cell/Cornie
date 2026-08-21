import {
  ApiError,
  createAbortContext,
  createHttpError,
  normalizeFetchError,
  raceWithAbort,
  request
} from './request.js'

export { ApiError } from './request.js'

const API_BASE = 'http://127.0.0.1:5174/api'

// 统一请求入口：默认 30s 超时 + 外部 AbortSignal 透传合并 + 结构化错误分类。
// 返回值结构不变：2xx 返回 res.json()，204 返回 null。
export async function apiFetch(path, init) {
  const { signal, timeoutMs, ...rest } = init ?? {}
  const res = await request(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(rest.headers || {}) },
    ...rest
  }, { signal, timeoutMs })
  return res.status === 204 ? null : res.json()
}

export async function listEntries({ month } = {}) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiFetch(`/entries${qs}`)
}

export async function getEntry(date, { signal } = {}) {
  return apiFetch(`/entries/${encodeURIComponent(date)}`, { signal })
}

export async function upsertEntry(date, payload) {
  return apiFetch(`/entries/${encodeURIComponent(date)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function regenerateCornie(date) {
  return apiFetch(`/entries/${encodeURIComponent(date)}/regenerate-cornie`, {
    method: 'POST'
  })
}

export async function listOnThisDay(date, { limit } = {}) {
  const qs = limit ? `?limit=${encodeURIComponent(String(limit))}` : ''
  return apiFetch(`/entries/${encodeURIComponent(date)}/on-this-day${qs}`)
}

// ─── conversations ────────────────────────────────────────────

export async function sendMessage(message, date) {
  return apiFetch('/conversations', {
    method: 'POST',
    body: JSON.stringify({ message, date })
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
    const response = await raceWithAbort(fetch(`${API_BASE}/conversations/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, date }),
      signal: ctx.signal
    }), ctx)

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
    archiveScope: data?.archiveScope || { scope: scope || 'all', month: month || '', recentFromDate: '', recentToDate: '' },
    searchMeta: data?.searchMeta || { query: query || '', mode: query ? 'keyword' : 'browse' },
    storage: data?.storage || data?.meta?.storage || { driver: 'unknown', queryContractVersion: 1 },
    meta: data?.meta || { responseType: 'chatlog_history_list' }
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
    meta: data?.meta || { responseType: 'chatlog_message_snippet_search' }
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
  const normalizedMessages = Array.isArray(data?.messages)
    ? data.messages
    : normalizedItems
  const normalizedPagination = data?.pagination || {
    cursor: data?.context?.currentCursor || '0',
    nextCursor: data?.nextCursor ?? null,
    hasMore: data?.hasMore === true,
    pageSize: data?.context?.pageSize || limit || 100,
    total: data?.context?.total || normalizedMessages.length
  }
  return {
    ...data,
    items: normalizedItems,
    messages: normalizedMessages,
    context: data?.context || null,
    pagination: normalizedPagination,
    meta: data?.meta || { responseType: mode === 'page' ? 'chatlog_day_page' : 'chatlog_day_record' },
    storage: data?.storage || data?.meta?.storage || { driver: 'unknown', queryContractVersion: 1 }
  }
}

export async function exportChatlogByDate(date, { format = 'json' } = {}) {
  const params = new URLSearchParams()
  if (format) params.set('format', format)
  const qs = params.toString()
  const data = await apiFetch(`/chatlogs/${encodeURIComponent(date)}/export${qs ? `?${qs}` : ''}`)
  return {
    ...data,
    meta: data?.meta || { responseType: 'chatlog_day_export' }
  }
}

export async function exportChatlogByMonth(month, { format = 'json' } = {}) {
  const params = new URLSearchParams()
  if (format) params.set('format', format)
  const qs = params.toString()
  const data = await apiFetch(`/chatlogs/export/month/${encodeURIComponent(month)}${qs ? `?${qs}` : ''}`)
  return {
    ...data,
    meta: data?.meta || { responseType: 'chatlog_month_export' }
  }
}

// ─── model ───────────────────────────────────────────────────

export async function getModelStatus() {
  return apiFetch('/model/status')
}

export async function getModelSettings() {
  return apiFetch('/settings/model')
}

export async function saveModelSettings(payload) {
  return apiFetch('/settings/model', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function clearModelSettings() {
  return apiFetch('/settings/model', {
    method: 'DELETE'
  })
}

export async function submitConfirmationDecision(id, decision) {
  return apiFetch(`/confirmations/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision })
  })
}

export async function getConfirmation(id) {
  return apiFetch(`/confirmations/${encodeURIComponent(id)}`)
}

export async function listConfirmations({ date, status } = {}) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (status) params.set('status', status)
  const qs = params.toString()
  return apiFetch(`/confirmations${qs ? `?${qs}` : ''}`)
}

// ─── ledger ──────────────────────────────────────────────────

export async function listLedgerEntries({ from, to, type, categoryId, categoryName, recent, ids } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (type) params.set('type', type)
  if (categoryId) params.set('categoryId', categoryId)
  if (categoryName) params.set('categoryName', categoryName)
  if (recent !== undefined) params.set('recent', String(recent))
  if (Array.isArray(ids) && ids.length > 0) params.set('ids', ids.join(','))
  const qs = params.toString()
  return apiFetch(`/ledger/entries${qs ? `?${qs}` : ''}`)
}

export async function getLedgerEntry(id) {
  return apiFetch(`/ledger/entries/${encodeURIComponent(id)}`)
}

export async function createExpenseEntry(payload) {
  return apiFetch('/ledger/entries/expense', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function createIncomeEntry(payload) {
  return apiFetch('/ledger/entries/income', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateLedgerEntry(id, payload) {
  return apiFetch(`/ledger/entries/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteLedgerEntry(id) {
  return apiFetch(`/ledger/entries/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

export async function listLedgerCategories({ type } = {}) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : ''
  return apiFetch(`/ledger/categories${qs}`)
}

export async function getLedgerCategory(id) {
  return apiFetch(`/ledger/categories/${encodeURIComponent(id)}`)
}

export async function createExpenseCategory(payload) {
  return apiFetch('/ledger/categories/expense', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function createIncomeCategory(payload) {
  return apiFetch('/ledger/categories/income', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateLedgerCategory(id, payload) {
  return apiFetch(`/ledger/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function restoreLedgerCategory(id) {
  return apiFetch(`/ledger/categories/${encodeURIComponent(id)}/restore`, {
    method: 'POST'
  })
}

// ─── todo ────────────────────────────────────────────────────

export async function listTodos({ view, from, to } = {}) {
  const params = new URLSearchParams()
  if (view) params.set('view', view)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return apiFetch(`/todos${qs ? `?${qs}` : ''}`)
}

export async function getTodo(id) {
  return apiFetch(`/todos/${encodeURIComponent(id)}`)
}

export async function createTodo(payload) {
  return apiFetch('/todos', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateTodo(id, payload) {
  return apiFetch(`/todos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function completeTodo(id) {
  return apiFetch(`/todos/${encodeURIComponent(id)}/complete`, {
    method: 'POST'
  })
}

export async function reopenTodo(id) {
  return apiFetch(`/todos/${encodeURIComponent(id)}/reopen`, {
    method: 'POST'
  })
}

export async function deleteTodo(id) {
  return apiFetch(`/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

export async function listTodoCategories() {
  return apiFetch('/todo-categories')
}

export async function getTodoCategory(id) {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}`)
}

export async function createTodoCategory(payload) {
  return apiFetch('/todo-categories', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateTodoCategory(id, payload) {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function restoreTodoCategory(id) {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}/restore`, {
    method: 'POST'
  })
}

export async function reorderTodoCategory(id, sortOrder) {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ sortOrder })
  })
}

// ─── schedule ────────────────────────────────────────────────

export async function listSchedules({ view, from, to } = {}) {
  const params = new URLSearchParams()
  if (view) params.set('view', view)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return apiFetch(`/schedules${qs ? `?${qs}` : ''}`)
}

export async function getSchedule(id) {
  return apiFetch(`/schedules/${encodeURIComponent(id)}`)
}

export async function createSchedule(payload) {
  return apiFetch('/schedules', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateSchedule(id, payload) {
  return apiFetch(`/schedules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function cancelSchedule(id) {
  return apiFetch(`/schedules/${encodeURIComponent(id)}/cancel`, {
    method: 'POST'
  })
}

export async function restoreSchedule(id) {
  return apiFetch(`/schedules/${encodeURIComponent(id)}/restore`, {
    method: 'POST'
  })
}

export async function deleteSchedule(id) {
  return apiFetch(`/schedules/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

export async function listScheduleCategories() {
  return apiFetch('/schedule-categories')
}

export async function getScheduleCategory(id) {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}`)
}

export async function createScheduleCategory(payload) {
  return apiFetch('/schedule-categories', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateScheduleCategory(id, payload) {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function restoreScheduleCategory(id) {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}/restore`, {
    method: 'POST'
  })
}

export async function reorderScheduleCategory(id, sortOrder) {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ sortOrder })
  })
}

// ─── memory wiki ─────────────────────────────────────────────

export async function listMemoryWikiPages({ pageType, status, limit, offset } = {}) {
  const params = new URLSearchParams()
  if (pageType) params.set('pageType', pageType)
  if (status) params.set('status', status)
  if (Number.isFinite(Number(limit)) && Number(limit) > 0) params.set('limit', String(limit))
  if (Number.isFinite(Number(offset)) && Number(offset) > 0) params.set('offset', String(offset))
  const qs = params.toString()
  const data = await apiFetch(`/memory-wiki/pages${qs ? `?${qs}` : ''}`)
  const items = Array.isArray(data?.items)
    ? data.items.map((item) => ({
        ...item,
        id: item?.id ?? item?.pageId ?? '',
        pageId: item?.pageId ?? item?.id ?? '',
        content: item?.content ?? item?.body ?? '',
        updatedAt: item?.updatedAt ?? item?.lastUpdatedAt ?? '',
        triggerKeywords: Array.isArray(item?.triggerKeywords) ? item.triggerKeywords : [],
        ownerConfirmed: item?.ownerConfirmed === true
      }))
    : []

  return {
    ...data,
    items,
    pages: items
  }
}

export async function getMemoryWikiPage(pageId) {
  const data = await apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}`)
  const rawPage = data?.page ?? data
  const page = rawPage
      ? {
        ...rawPage,
        id: rawPage?.id ?? rawPage?.pageId ?? '',
        pageId: rawPage?.pageId ?? rawPage?.id ?? '',
        content: rawPage?.content ?? rawPage?.body ?? '',
        body: rawPage?.body ?? rawPage?.content ?? '',
        updatedAt: rawPage?.updatedAt ?? rawPage?.lastUpdatedAt ?? '',
        triggerKeywords: Array.isArray(rawPage?.triggerKeywords) ? rawPage.triggerKeywords : [],
        ownerConfirmed: rawPage?.ownerConfirmed === true
      }
    : null

  return data?.page ? { ...data, page } : page
}

export async function getMemoryWikiPageSourceTrace(pageId) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/source-trace`)
}

export async function listMemoryWikiPageVersions(pageId) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/versions`)
}

export async function getMemoryWikiPageVersionDiff(pageId, { fromVersionId, toVersionId }) {
  const params = new URLSearchParams()
  params.set('fromVersionId', fromVersionId)
  params.set('toVersionId', toVersionId)
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/version-diff?${params.toString()}`)
}

export async function createMemoryWikiPage(payload) {
  const normalizedPayload = payload?.content !== undefined && payload?.body === undefined
    ? { ...payload, body: payload.content }
    : payload
  return apiFetch('/memory-wiki/pages', {
    method: 'POST',
    body: JSON.stringify(normalizedPayload)
  })
}

export async function updateMemoryWikiPage(pageId, payload) {
  const normalizedPayload = payload?.content !== undefined && payload?.body === undefined
    ? { ...payload, body: payload.content }
    : payload
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}`, {
    method: 'PUT',
    body: JSON.stringify(normalizedPayload)
  })
}

export async function updateMemoryWikiSummary(pageId, summary) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/summary`, {
    method: 'PUT',
    body: JSON.stringify({ summary })
  })
}

export async function updateMemoryWikiAliases(pageId, aliases) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/aliases`, {
    method: 'PUT',
    body: JSON.stringify({ aliases })
  })
}

export async function setMemoryWikiStatus(pageId, status) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  })
}

export async function setMemoryWikiImportance(pageId, importance) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/importance`, {
    method: 'PUT',
    body: JSON.stringify({ importance })
  })
}

export async function archiveMemoryWikiPage(pageId) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/archive`, {
    method: 'POST'
  })
}

export async function restoreMemoryWikiPage(pageId) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/restore`, {
    method: 'POST'
  })
}

export async function rollbackMemoryWikiPage(pageId, versionId) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ versionId })
  })
}

export async function mergeMemoryWikiPages(payload) {
  return apiFetch('/memory-wiki/pages/merge', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function linkMemoryWikiRelatedPages(pageId, relatedPageIds) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/related-pages`, {
    method: 'PUT',
    body: JSON.stringify({ relatedPageIds })
  })
}

export async function listTopicIndexItems() {
  return apiFetch('/memory-wiki/topic-index')
}

export async function getTopicIndexItem(normalizedKey) {
  return apiFetch(`/memory-wiki/topic-index/${encodeURIComponent(normalizedKey)}`)
}

export async function getTopicIndexSourceTrace(normalizedKey) {
  return apiFetch(`/memory-wiki/topic-index/${encodeURIComponent(normalizedKey)}/source-trace`)
}

export async function updateTopicIndexAliases(normalizedKey, aliases) {
  return apiFetch(`/memory-wiki/topic-index/${encodeURIComponent(normalizedKey)}/aliases`, {
    method: 'PUT',
    body: JSON.stringify({ aliases })
  })
}

export async function linkTopicIndexPage(normalizedKey, pageId) {
  return apiFetch(`/memory-wiki/topic-index/${encodeURIComponent(normalizedKey)}/link-page`, {
    method: 'POST',
    body: JSON.stringify({ pageId })
  })
}

export async function linkMemoryWikiPageToTopic(pageId, payload) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/link-topic`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function listMemoryWikiGovernanceRequests({ status, requestType, triggerSource, queueSection } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (requestType) params.set('requestType', requestType)
  if (triggerSource) params.set('triggerSource', triggerSource)
  if (queueSection) params.set('queueSection', queueSection)
  const qs = params.toString()
  return apiFetch(`/memory-wiki/governance${qs ? `?${qs}` : ''}`)
}

export async function getMemoryWikiGovernanceRequest(requestId) {
  return apiFetch(`/memory-wiki/governance/${encodeURIComponent(requestId)}`)
}

export async function updateMemoryWikiGovernanceRequestStatus(requestId, status) {
  return apiFetch(`/memory-wiki/governance/${encodeURIComponent(requestId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  })
}

export async function enqueueMemoryWikiInspectionScan() {
  return apiFetch('/memory-wiki/governance/inspection-scan', {
    method: 'POST'
  })
}

// ─── observations ─────────────────────────────────────────────

export async function listObservations({ date, from, to, type, q, limit, signal } = {}) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (type) params.set('type', type)
  if (q) params.set('q', q)
  if (limit) params.set('limit', String(limit))
  const qs = params.toString()
  return apiFetch(`/observations${qs ? `?${qs}` : ''}`, { signal })
}

export async function recallObservations({ date, from, to, type, q, topic, person, limit } = {}) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (type) params.set('type', type)
  if (q) params.set('q', q)
  if (topic) params.set('topic', topic)
  if (person) params.set('person', person)
  if (limit) params.set('limit', String(limit))
  const qs = params.toString()
  return apiFetch(`/observations/recall${qs ? `?${qs}` : ''}`)
}

export async function getObservation(id) {
  return apiFetch(`/observations/${encodeURIComponent(id)}`)
}

export async function createObservation(payload) {
  return apiFetch('/observations', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateObservation(id, payload) {
  return apiFetch(`/observations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteObservation(id) {
  return apiFetch(`/observations/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

