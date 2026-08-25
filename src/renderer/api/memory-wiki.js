import { apiFetch } from './shared.js'

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
        ownerConfirmed: item?.ownerConfirmed === true,
      }))
    : []

  return {
    ...data,
    items,
    pages: items,
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
        ownerConfirmed: rawPage?.ownerConfirmed === true,
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
  const normalizedPayload =
    payload?.content !== undefined && payload?.body === undefined ? { ...payload, body: payload.content } : payload
  return apiFetch('/memory-wiki/pages', {
    method: 'POST',
    body: JSON.stringify(normalizedPayload),
  })
}

export async function updateMemoryWikiPage(pageId, payload) {
  const normalizedPayload =
    payload?.content !== undefined && payload?.body === undefined ? { ...payload, body: payload.content } : payload
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}`, {
    method: 'PUT',
    body: JSON.stringify(normalizedPayload),
  })
}

export async function updateMemoryWikiSummary(pageId, summary) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/summary`, {
    method: 'PUT',
    body: JSON.stringify({ summary }),
  })
}

export async function updateMemoryWikiAliases(pageId, aliases) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/aliases`, {
    method: 'PUT',
    body: JSON.stringify({ aliases }),
  })
}

export async function setMemoryWikiStatus(pageId, status) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export async function setMemoryWikiImportance(pageId, importance) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/importance`, {
    method: 'PUT',
    body: JSON.stringify({ importance }),
  })
}

export async function archiveMemoryWikiPage(pageId) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/archive`, {
    method: 'POST',
  })
}

export async function restoreMemoryWikiPage(pageId) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/restore`, {
    method: 'POST',
  })
}

export async function rollbackMemoryWikiPage(pageId, versionId) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ versionId }),
  })
}

export async function mergeMemoryWikiPages(payload) {
  return apiFetch('/memory-wiki/pages/merge', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function linkMemoryWikiRelatedPages(pageId, relatedPageIds) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/related-pages`, {
    method: 'PUT',
    body: JSON.stringify({ relatedPageIds }),
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
    body: JSON.stringify({ aliases }),
  })
}

export async function linkTopicIndexPage(normalizedKey, pageId) {
  return apiFetch(`/memory-wiki/topic-index/${encodeURIComponent(normalizedKey)}/link-page`, {
    method: 'POST',
    body: JSON.stringify({ pageId }),
  })
}

export async function linkMemoryWikiPageToTopic(pageId, payload) {
  return apiFetch(`/memory-wiki/pages/${encodeURIComponent(pageId)}/link-topic`, {
    method: 'POST',
    body: JSON.stringify(payload),
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
    body: JSON.stringify({ status }),
  })
}

export async function enqueueMemoryWikiInspectionScan() {
  return apiFetch('/memory-wiki/governance/inspection-scan', {
    method: 'POST',
  })
}
