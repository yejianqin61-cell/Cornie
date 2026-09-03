import { apiFetch } from './shared'

// ── 页面（pages） ──

export interface MemoryWikiPage {
  id: string
  pageId: string
  title?: string
  content: string
  body?: string
  summary?: string
  pageType?: string
  status?: string
  importance?: string | number
  aliases?: string[]
  triggerKeywords: string[]
  ownerConfirmed: boolean
  updatedAt: string
  [key: string]: unknown
}

// 列表项与页面同构：保留独立类型名以维持桶导出契约的可读性
export type MemoryWikiPageListItem = MemoryWikiPage

function normalizePage(raw: Record<string, unknown> | null | undefined): MemoryWikiPage | null {
  if (!raw) return null
  return {
    ...(raw as MemoryWikiPage),
    id: String(raw.id ?? raw.pageId ?? ''),
    pageId: String(raw.pageId ?? raw.id ?? ''),
    content: String(raw.content ?? raw.body ?? ''),
    body: String(raw.body ?? raw.content ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.lastUpdatedAt ?? ''),
    triggerKeywords: Array.isArray(raw.triggerKeywords) ? raw.triggerKeywords : [],
    ownerConfirmed: raw.ownerConfirmed === true,
  }
}

export async function listMemoryWikiPages({
  pageType,
  status,
  limit,
  offset,
}: {
  pageType?: string
  status?: string
  limit?: number
  offset?: number
} = {}): Promise<{ items: MemoryWikiPage[]; pages: MemoryWikiPage[]; [key: string]: unknown }> {
  const params = new URLSearchParams()
  if (pageType) params.set('pageType', pageType)
  if (status) params.set('status', status)
  if (Number.isFinite(Number(limit)) && Number(limit) > 0) params.set('limit', String(limit))
  if (Number.isFinite(Number(offset)) && Number(offset) > 0) params.set('offset', String(offset))
  const qs = params.toString()
  const data = await apiFetch<Record<string, unknown>>(`/memory-wiki/pages${qs ? `?${qs}` : ''}`)
  const rawItems = Array.isArray(data?.items) ? (data.items as Array<Record<string, unknown>>) : []
  const items = rawItems.map((item) => normalizePage(item)).filter((item): item is MemoryWikiPage => item !== null)

  return {
    ...data,
    items,
    pages: items,
  }
}

export async function getMemoryWikiPage(
  pageId: string
): Promise<MemoryWikiPage | { page: MemoryWikiPage; [key: string]: unknown }> {
  const data = await apiFetch<Record<string, unknown>>(`/memory-wiki/pages/${encodeURIComponent(pageId)}`)
  const rawPage = (data?.page ?? data) as Record<string, unknown> | null
  const page = normalizePage(rawPage)

  return data?.page ? { ...data, page: page as MemoryWikiPage } : (page as MemoryWikiPage)
}

export async function getMemoryWikiPageSourceTrace(pageId: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/source-trace`)
}

export async function listMemoryWikiPageVersions(pageId: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/versions`)
}

export async function getMemoryWikiPageVersionDiff(
  pageId: string,
  { fromVersionId, toVersionId }: { fromVersionId: string; toVersionId: string }
): Promise<unknown> {
  const params = new URLSearchParams()
  params.set('fromVersionId', fromVersionId)
  params.set('toVersionId', toVersionId)
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/version-diff?${params.toString()}`)
}

export async function createMemoryWikiPage(payload: Record<string, unknown>): Promise<unknown> {
  const normalizedPayload =
    payload?.content !== undefined && payload?.body === undefined ? { ...payload, body: payload.content } : payload
  return apiFetch('/memory-wiki/pages', {
    method: 'POST',
    body: JSON.stringify(normalizedPayload),
  })
}

export async function updateMemoryWikiPage(pageId: string, payload: Record<string, unknown>): Promise<unknown> {
  const normalizedPayload =
    payload?.content !== undefined && payload?.body === undefined ? { ...payload, body: payload.content } : payload
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}`, {
    method: 'PUT',
    body: JSON.stringify(normalizedPayload),
  })
}

export async function updateMemoryWikiSummary(pageId: string, summary: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/summary`, {
    method: 'PUT',
    body: JSON.stringify({ summary }),
  })
}

export async function updateMemoryWikiAliases(pageId: string, aliases: string[]): Promise<unknown> {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/aliases`, {
    method: 'PUT',
    body: JSON.stringify({ aliases }),
  })
}

export async function setMemoryWikiStatus(pageId: string, status: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export async function setMemoryWikiImportance(pageId: string, importance: string | number): Promise<unknown> {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/importance`, {
    method: 'PUT',
    body: JSON.stringify({ importance }),
  })
}

export async function archiveMemoryWikiPage(pageId: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/archive`, {
    method: 'POST',
  })
}

export async function restoreMemoryWikiPage(pageId: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/restore`, {
    method: 'POST',
  })
}

export async function rollbackMemoryWikiPage(pageId: string, versionId: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ versionId }),
  })
}

export async function mergeMemoryWikiPages(payload: Record<string, unknown>): Promise<unknown> {
  return apiFetch('/memory-wiki/pages/merge', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function linkMemoryWikiRelatedPages(pageId: string, relatedPageIds: string[]): Promise<unknown> {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/related-pages`, {
    method: 'PUT',
    body: JSON.stringify({ relatedPageIds }),
  })
}

// ── 主题索引（topic index） ──

export async function listTopicIndexItems(): Promise<unknown> {
  return apiFetch('/memory-wiki/topic-index')
}

export async function getTopicIndexItem(normalizedKey: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/topic-index/${encodeURIComponent(normalizedKey)}`)
}

export async function getTopicIndexSourceTrace(normalizedKey: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/topic-index/${encodeURIComponent(normalizedKey)}/source-trace`)
}

export async function updateTopicIndexAliases(normalizedKey: string, aliases: string[]): Promise<unknown> {
  return apiFetch(`/memory-wiki/topic-index/${encodeURIComponent(normalizedKey)}/aliases`, {
    method: 'PUT',
    body: JSON.stringify({ aliases }),
  })
}

export async function linkTopicIndexPage(normalizedKey: string, pageId: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/topic-index/${encodeURIComponent(normalizedKey)}/link-page`, {
    method: 'POST',
    body: JSON.stringify({ pageId }),
  })
}

export async function linkMemoryWikiPageToTopic(pageId: string, payload: Record<string, unknown>): Promise<unknown> {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/link-topic`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── 治理（governance） ──

export async function listMemoryWikiGovernanceRequests({
  status,
  requestType,
  triggerSource,
  queueSection,
}: {
  status?: string
  requestType?: string
  triggerSource?: string
  queueSection?: string
} = {}): Promise<unknown> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (requestType) params.set('requestType', requestType)
  if (triggerSource) params.set('triggerSource', triggerSource)
  if (queueSection) params.set('queueSection', queueSection)
  const qs = params.toString()
  return apiFetch(`/memory-wiki/governance${qs ? `?${qs}` : ''}`)
}

export async function getMemoryWikiGovernanceRequest(requestId: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/governance/${encodeURIComponent(requestId)}`)
}

export async function updateMemoryWikiGovernanceRequestStatus(requestId: string, status: string): Promise<unknown> {
  return apiFetch(`/memory-wiki/governance/${encodeURIComponent(requestId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export async function enqueueMemoryWikiInspectionScan(): Promise<unknown> {
  return apiFetch('/memory-wiki/governance/inspection-scan', {
    method: 'POST',
  })
}
