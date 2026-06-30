import { createMemoryWikiGovernanceStore } from '../memory-wiki/index.js'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizeCompareText(value) {
  return normalizeString(value)
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function tokenizeText(value) {
  return Array.from(
    new Set(
      normalizeCompareText(value)
        .split(/[^a-z0-9\u4e00-\u9fff:]+/i)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2)
    )
  )
}

function buildObservationTopicKey(observation = {}) {
  const relatedRef = normalizeString(observation.relatedRef)
  if (relatedRef) return relatedRef

  const tokens = tokenizeText([observation.title, observation.content, observation.sourceText].join(' '))
  return tokens[0] || normalizeString(observation.title) || normalizeString(observation.type)
}

function hasMeaningfulOverlap(left, right) {
  const leftTokens = tokenizeText(left)
  const rightTokens = tokenizeText(right)
  return leftTokens.some((token) => rightTokens.includes(token))
}

function isDuplicateCompressionRequest(item, observationIds = []) {
  if (!item || item.requestType !== 'observation_compression_candidate') return false
  if (!(item.status === 'pending' || item.status === 'deferred')) return false
  const evidence = Array.isArray(item.evidence) ? item.evidence : []
  const existingIds = evidence.map((entry) => normalizeString(entry?.observationId)).filter(Boolean)
  return observationIds.every((id) => existingIds.includes(normalizeString(id)))
}

function buildCompressionRequest({ date, topicKey, observations }) {
  const pageIds = []
  const topicKeys = [topicKey].filter(Boolean)

  return {
    requestType: 'observation_compression_candidate',
    triggerSource: 'observation_governance',
    queueSection: 'observation_archive_candidates',
    riskLevel: 'medium',
    pageIds,
    topicKeys,
    title: `${date} · ${topicKey || '观察日志'} 可压缩`,
    reason: '同日同主题的观察日志出现相近事实，建议进入治理审核后决定是否压缩为更紧凑的事实摘要。',
    evidence: observations.map((item) => ({
      observationId: item.id,
      date: item.date,
      type: item.type,
      title: item.title,
      content: item.content,
      relatedRef: item.relatedRef ?? ''
    })),
    payload: {
      action: 'review_observation_compression',
      date,
      topicKey,
      observationIds: observations.map((item) => item.id)
    }
  }
}

export async function enqueueObservationCompressionCandidates(
  store,
  {
    baseDir = process.cwd(),
    date,
    observations = []
  } = {}
) {
  const normalizedDate = normalizeString(date)
  if (!normalizedDate || !Array.isArray(observations) || observations.length < 2) {
    return { created: [], skipped: ['insufficient_same_day_observations'] }
  }

  const governanceStore = await createMemoryWikiGovernanceStore(baseDir)
  const existing = await governanceStore.list({
    queueSection: 'observation_archive_candidates'
  })

  const grouped = new Map()
  for (const observation of observations) {
    if (normalizeString(observation?.date) !== normalizedDate) continue
    const topicKey = buildObservationTopicKey(observation)
    if (!topicKey) continue
    if (!grouped.has(topicKey)) {
      grouped.set(topicKey, [])
    }
    grouped.get(topicKey).push(observation)
  }

  const created = []
  const skipped = []

  for (const [topicKey, items] of grouped.entries()) {
    if (items.length < 2) continue

    const anchor = items[0]
    const similarItems = items.filter((item) =>
      hasMeaningfulOverlap(
        [anchor.title, anchor.content, anchor.sourceText, anchor.relatedRef].join(' '),
        [item.title, item.content, item.sourceText, item.relatedRef].join(' ')
      )
    )

    if (similarItems.length < 2) continue

    const observationIds = similarItems.map((item) => item.id)
    const duplicated = existing.some((item) => isDuplicateCompressionRequest(item, observationIds))
    if (duplicated) {
      skipped.push(`${topicKey}:duplicate_compression_candidate`)
      continue
    }

    const request = await governanceStore.create(
      buildCompressionRequest({
        date: normalizedDate,
        topicKey,
        observations: similarItems
      })
    )
    existing.unshift(request)
    created.push(request)
  }

  return {
    created,
    skipped
  }
}
