function nowMs() {
  return Date.now()
}

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function sumMessageChars(messages) {
  return ensureArray(messages).reduce((total, message) => total + String(message?.content ?? '').length, 0)
}

function summarizeContextMeta(contextMeta = {}) {
  return {
    recentConversationChars: contextMeta.recentConversationChars ?? 0,
    categorySummaryChars: contextMeta.categorySummaryChars ?? 0,
    todoSummaryChars: contextMeta.todoSummaryChars ?? 0,
    scheduleSummaryChars: contextMeta.scheduleSummaryChars ?? 0,
    observationSummaryChars: contextMeta.observationSummaryChars ?? 0,
    memorySummaryChars: contextMeta.memorySummaryChars ?? 0,
    toolSummaryChars: contextMeta.toolSummaryChars ?? 0,
    categoryCounts: contextMeta.categoryCounts ?? {},
    todoCount: contextMeta.todoCount ?? 0,
    scheduleCount: contextMeta.scheduleCount ?? 0,
    observationCount: contextMeta.observationCount ?? 0,
    memoryHitCount: contextMeta.memoryHitCount ?? 0
  }
}

export function createTurnTelemetry({ source, date, message }) {
  return {
    source,
    date,
    messageChars: String(message ?? '').length,
    startedAtMs: nowMs(),
    context: null,
    prompts: {
      initialPromptChars: 0,
      followups: []
    },
    model: {
      callCount: 0,
      totalDurationMs: 0,
      maxPromptChars: 0,
      totalPromptChars: 0,
      totalResponseChars: 0,
      calls: []
    },
    tools: {
      roundCount: 0,
      toolCallCount: 0,
      totalDurationMs: 0,
      lookupRoundCount: 0,
      lookupResultCount: 0,
      lookupCacheHitCount: 0,
      rounds: []
    },
    outcome: {
      policyDecision: 'allow',
      pendingConfirmation: false,
      toolExecutionUsed: false,
      finalReplyChars: 0
    }
  }
}

export function attachContextTelemetry(telemetry, context) {
  if (!telemetry) {
    return
  }

  telemetry.context = summarizeContextMeta(context?.contextMeta ?? {})
}

export function captureInitialPromptTelemetry(telemetry, messages) {
  if (!telemetry) {
    return
  }

  telemetry.prompts.initialPromptChars = sumMessageChars(messages)
}

export function recordFollowupPromptTelemetry(telemetry, metrics) {
  if (!telemetry || !metrics) {
    return
  }

  telemetry.prompts.followups.push({
    phase: metrics.phase ?? 'followup',
    promptChars: Number(metrics.promptChars ?? 0),
    legacyPromptCharsEstimate: Number(metrics.legacyPromptCharsEstimate ?? 0)
  })
}

export function recordModelCallTelemetry(telemetry, entry) {
  if (!telemetry || !entry) {
    return
  }

  const promptChars = Number(entry.promptChars ?? 0)
  const responseChars = Number(entry.responseChars ?? 0)
  const durationMs = Number(entry.durationMs ?? 0)

  telemetry.model.callCount += 1
  telemetry.model.totalDurationMs += durationMs
  telemetry.model.totalPromptChars += promptChars
  telemetry.model.totalResponseChars += responseChars
  telemetry.model.maxPromptChars = Math.max(telemetry.model.maxPromptChars, promptChars)
  telemetry.model.calls.push({
    phase: entry.phase ?? 'model_call',
    attempt: Number(entry.attempt ?? 1),
    promptChars,
    responseChars,
    durationMs
  })
}

export function recordToolRoundTelemetry(telemetry, entry) {
  if (!telemetry || !entry) {
    return
  }

  const toolCalls = ensureArray(entry.toolCalls)
  const lookupContexts = ensureArray(entry.lookupContexts)
  const durationMs = Number(entry.durationMs ?? 0)

  telemetry.tools.roundCount += 1
  telemetry.tools.toolCallCount += toolCalls.length
  telemetry.tools.totalDurationMs += durationMs

  if (entry.isLookupOnly) {
    telemetry.tools.lookupRoundCount += 1
  }

  telemetry.tools.lookupResultCount += lookupContexts.length
  telemetry.tools.lookupCacheHitCount += lookupContexts.filter((item) => item?.hitSource === 'cache').length
  telemetry.tools.rounds.push({
    round: Number(entry.round ?? telemetry.tools.roundCount),
    isLookupOnly: entry.isLookupOnly === true,
    durationMs,
    toolNames: toolCalls.map((item) => item?.tool_name).filter(Boolean),
    lookupDomains: lookupContexts.map((item) => item?.domain).filter(Boolean),
    lookupCacheHitCount: lookupContexts.filter((item) => item?.hitSource === 'cache').length
  })
}

export function finalizeTurnTelemetry(telemetry, outcome = {}) {
  if (!telemetry) {
    return null
  }

  telemetry.completedAtMs = nowMs()
  telemetry.totalDurationMs = telemetry.completedAtMs - telemetry.startedAtMs
  telemetry.outcome = {
    policyDecision: outcome.policyDecision ?? telemetry.outcome.policyDecision,
    pendingConfirmation: outcome.pendingConfirmation === true,
    toolExecutionUsed: outcome.toolExecutionUsed === true,
    finalReplyChars: String(outcome.finalReply ?? '').length
  }

  return {
    source: telemetry.source,
    date: telemetry.date,
    messageChars: telemetry.messageChars,
    totalDurationMs: telemetry.totalDurationMs,
    context: telemetry.context,
    prompts: telemetry.prompts,
    model: telemetry.model,
    tools: telemetry.tools,
    outcome: telemetry.outcome
  }
}
