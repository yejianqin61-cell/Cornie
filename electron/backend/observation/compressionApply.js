import { getObservationLog } from '../../db.js'
import { createObservationService } from './service.js'
import { createMemoryWikiAuditStore, createMemoryWikiGovernanceStore } from '../memory-wiki/index.js'

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

// 461：观察日志压缩闭环执行端。
// 人类在治理队列批准压缩候选后，将同日同主题的多条观察压缩为一条摘要观察，
// 原始条目的完整内容保留在摘要的 sourceText（信息不丢失），随后删除原条目。
export async function applyObservationCompressionRequest(
  store,
  { baseDir = process.cwd(), requestId } = {}
) {
  if (!requestId) {
    throw new Error('observation compression requestId is required')
  }

  const governanceStore = await createMemoryWikiGovernanceStore(baseDir)
  const request = await governanceStore.get(requestId)
  if (!request) {
    throw new Error(`governance request not found: ${requestId}`)
  }
  if (normalizeString(request.requestType) !== 'observation_compression_candidate') {
    throw new Error(`governance request is not a compression candidate: ${requestId}`)
  }
  if (!['pending', 'deferred'].includes(normalizeString(request.status))) {
    throw new Error(`governance request cannot be applied from status: ${request.status}`)
  }

  const payload = request.payload ?? {}
  const observationIds = Array.isArray(payload.observationIds) ? payload.observationIds : []
  const originals = observationIds
    .map((id) => getObservationLog(store, id))
    .filter(Boolean)
  if (originals.length < 2) {
    throw new Error(`compression requires at least 2 observations: ${requestId}`)
  }

  const observation = createObservationService(store)
  const date = normalizeString(payload.date) || normalizeString(originals[0]?.date)
  const topicKey = normalizeString(payload.topicKey) || normalizeString(originals[0]?.title) || '观察日志'

  const summaryContent = originals
    .map((item) => `- ${normalizeString(item.title)}：${normalizeString(item.content)}`)
    .join('\n')

  const summaryResult = observation.addNoteSmart({
    date,
    type: 'summary',
    title: `${date} · ${topicKey} 压缩摘要`,
    content: summaryContent,
    sourceText: originals.map((item) => `主人：${normalizeString(item.content)}`).join('\n')
  })
  const summary = summaryResult.note

  const archivedIds = []
  for (const original of originals) {
    observation.deleteNote({ id: original.id })
    archivedIds.push(original.id)
  }

  // 459 状态机：deferred 请求先复活为 pending 再置 approved。
  if (normalizeString(request.status) === 'deferred') {
    await governanceStore.updateStatus(requestId, 'pending')
  }
  const approvedRequest = await governanceStore.updateStatus(requestId, 'approved')

  const auditStore = await createMemoryWikiAuditStore(baseDir)
  const audit = await auditStore.append({
    eventType: 'observation_compression_applied',
    pageId: null,
    reason: `${date} · ${topicKey}：${originals.length} 条观察压缩为 1 条摘要`,
    details: { date, topicKey, summaryId: summary?.id ?? null, archivedIds }
  })

  return {
    request: approvedRequest,
    summary,
    archivedIds,
    audit
  }
}
