import { apiGet, apiPost, apiPut } from './client.js'

export function listPages(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return apiGet(`/api/memory-wiki/pages${s ? `?${s}` : ''}`)
}

export function getPage(pageId) {
  return apiGet(`/api/memory-wiki/pages/${pageId}`)
}

export function createPage(body) {
  return apiPost('/api/memory-wiki/pages', body)
}

export function updatePage(pageId, body) {
  return apiPut(`/api/memory-wiki/pages/${pageId}`, body)
}

export function getPageSourceTrace(pageId) {
  return apiGet(`/api/memory-wiki/pages/${pageId}/source-trace`)
}

export function listVersions(pageId) {
  return apiGet(`/api/memory-wiki/pages/${pageId}/versions`)
}

export function getVersionDiff(pageId, { fromVersionId, toVersionId }) {
  const qs = `?fromVersionId=${encodeURIComponent(fromVersionId)}&toVersionId=${encodeURIComponent(toVersionId)}`
  return apiGet(`/api/memory-wiki/pages/${pageId}/version-diff${qs}`)
}

export function listTopics() {
  return apiGet('/api/memory-wiki/topic-index')
}

export function getTopic(normalizedKey) {
  return apiGet(`/api/memory-wiki/topic-index/${normalizedKey}`)
}

export function getTopicSourceTrace(normalizedKey) {
  return apiGet(`/api/memory-wiki/topic-index/${normalizedKey}/source-trace`)
}

export function listGovernance(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return apiGet(`/api/memory-wiki/governance${s ? `?${s}` : ''}`)
}

export function getGovernanceRequest(requestId) {
  return apiGet(`/api/memory-wiki/governance/${requestId}`)
}

export function updateGovernanceStatus(requestId, status) {
  return apiPut(`/api/memory-wiki/governance/${requestId}/status`, { status })
}

export function applyGovernanceRequest(requestId) {
  return apiPost(`/api/memory-wiki/governance/${requestId}/apply`)
}

export function inspectionScan() {
  return apiPost('/api/memory-wiki/governance/inspection-scan')
}

export function archivePage(pageId) {
  return apiPost(`/api/memory-wiki/pages/${pageId}/archive`)
}

export function restorePage(pageId) {
  return apiPost(`/api/memory-wiki/pages/${pageId}/restore`)
}

export function rollbackPage(pageId, versionId) {
  return apiPost(`/api/memory-wiki/pages/${pageId}/rollback`, { versionId })
}

export function mergePages(targetPageId, sourcePageId) {
  return apiPost('/api/memory-wiki/pages/merge', { targetPageId, sourcePageId })
}

export function updatePageStatus(pageId, status) {
  return apiPut(`/api/memory-wiki/pages/${pageId}/status`, { status })
}

export function updatePageImportance(pageId, importance) {
  return apiPut(`/api/memory-wiki/pages/${pageId}/importance`, { importance })
}
