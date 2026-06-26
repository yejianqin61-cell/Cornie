function truncateText(value, maxLength = 120) {
  if (value == null) {
    return null
  }

  const text = String(value)
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength)}...`
}

export function logCategoryAudit(event) {
  const payload = {
    eventType: event.eventType,
    domain: event.domain ?? null,
    conversationId: event.conversationId ?? null,
    confirmRequestId: event.confirmRequestId ?? null,
    toolName: event.toolName ?? null,
    sourceText: truncateText(event.sourceText),
    categoryId: event.categoryId ?? null,
    categoryName: event.categoryName ?? null,
    proposedCategoryName: event.proposedCategoryName ?? null,
    similarCandidates: Array.isArray(event.similarCandidates) ? event.similarCandidates : [],
    decision: event.decision ?? null,
    reason: event.reason ?? null,
    createdAt: event.createdAt ?? new Date().toISOString()
  }

  console.log(`[category-audit] ${JSON.stringify(payload)}`)
  return payload
}
