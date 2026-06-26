function truncateText(value, maxLength = 120) {
  if (value == null) {
    return null
  }

  const text = String(value).trim()
  if (!text) {
    return null
  }

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength)}...`
}

function normalizeString(value) {
  if (value == null) {
    return null
  }

  const normalized = String(value).trim()
  return normalized || null
}

function buildIssueTags(sample) {
  const tags = new Set()

  if (sample.eventType === 'category_mapping_ask_back' && sample.chosenCategory) {
    tags.add('should_map_but_ask')
  }

  if (sample.eventType === 'category_mapping_needs_confirmation' && sample.proposedCategory && sample.chosenCategory) {
    tags.add('should_map_but_new')
  }

  if (sample.eventType === 'category_creation_reused_existing') {
    tags.add('duplicate_category_proposal')
  }

  if (sample.eventType === 'category_mapping_ask_back' && sample.proposedCategory) {
    tags.add('low_signal_generic_match')
  }

  if (sample.domain === 'schedule' && sample.eventType === 'category_mapping_resolved' && sample.chosenCategory === '提醒') {
    tags.add('low_signal_generic_match')
  }

  return [...tags]
}

function mapEventTypeToOutcome(eventType, decision) {
  if (eventType === 'category_mapping_resolved') {
    return 'mapped'
  }
  if (eventType === 'category_mapping_needs_confirmation') {
    return 'confirm'
  }
  if (eventType === 'category_mapping_ask_back') {
    return 'ask_back'
  }
  if (
    eventType === 'category_creation_approved' ||
    eventType === 'category_creation_reused_existing'
  ) {
    return 'confirm'
  }
  if (eventType === 'category_creation_rejected') {
    return 'rejected'
  }
  if (decision === 'mapped') {
    return 'mapped'
  }
  if (decision === 'ask_back') {
    return 'ask_back'
  }
  if (decision === 'confirm') {
    return 'confirm'
  }

  return 'observed'
}

export function normalizeCategoryAuditSample(event, options = {}) {
  const finalOutcome = mapEventTypeToOutcome(event?.eventType, event?.decision)
  const sample = {
    id: normalizeString(options.id) ?? normalizeString(event?.confirmRequestId) ?? `${event?.eventType ?? 'sample'}:${event?.createdAt ?? 'unknown'}`,
    domain: normalizeString(event?.domain) ?? normalizeString(options.domain),
    eventType: normalizeString(event?.eventType) ?? 'unknown',
    sourceType: normalizeString(options.sourceType) ?? 'audit_log',
    sourceRef: normalizeString(options.sourceRef) ?? null,
    userInput: truncateText(options.userInput ?? event?.sourceText, 160),
    snapshotSummary: normalizeString(options.snapshotSummary) ?? null,
    modelDecision: normalizeString(options.modelDecision ?? event?.decision) ?? null,
    finalOutcome,
    chosenCategory: normalizeString(options.chosenCategory ?? event?.categoryName),
    chosenCategoryId: normalizeString(options.chosenCategoryId ?? event?.categoryId),
    proposedCategory: normalizeString(options.proposedCategory ?? event?.proposedCategoryName),
    similarCandidates: Array.isArray(event?.similarCandidates) ? event.similarCandidates.filter(Boolean).slice(0, 5) : [],
    issueTags: [],
    recommendedFixPath: normalizeString(options.recommendedFixPath) ?? null,
    expectedBehavior: normalizeString(options.expectedBehavior) ?? null,
    observedBehavior: normalizeString(options.observedBehavior ?? event?.reason) ?? null,
    createdAt: normalizeString(event?.createdAt) ?? new Date().toISOString()
  }

  sample.issueTags = buildIssueTags(sample)
  return sample
}

export function normalizeCategoryAuditSamples(events = [], options = {}) {
  return (Array.isArray(events) ? events : [])
    .map((event, index) =>
      normalizeCategoryAuditSample(event, {
        ...options,
        id: options.idPrefix ? `${options.idPrefix}-${String(index + 1).padStart(3, '0')}` : undefined
      })
    )
    .filter((sample) => sample.domain || sample.eventType === 'category_snapshot_built')
}

export function filterCategoryAuditSamples(samples = [], filters = {}) {
  return (Array.isArray(samples) ? samples : []).filter((sample) => {
    if (filters.domain && sample.domain !== filters.domain) {
      return false
    }
    if (filters.finalOutcome && sample.finalOutcome !== filters.finalOutcome) {
      return false
    }
    if (filters.issueTag && !sample.issueTags.includes(filters.issueTag)) {
      return false
    }
    return true
  })
}

export function buildCategorySampleLedgerMarkdown(samples = []) {
  const normalizedSamples = Array.isArray(samples) ? samples : []
  const lines = [
    '# 类目映射失败样本草案',
    '',
    '| 样本ID | 域 | 结果 | 标签 | 用户输入 | 建议回灌入口 |',
    '| --- | --- | --- | --- | --- | --- |'
  ]

  for (const sample of normalizedSamples) {
    lines.push(
      `| ${sample.id} | ${sample.domain ?? 'unknown'} | ${sample.finalOutcome} | ${sample.issueTags.join('、') || '无'} | ${sample.userInput ?? '无'} | ${sample.recommendedFixPath ?? '待补'} |`
    )
  }

  return lines.join('\n')
}
