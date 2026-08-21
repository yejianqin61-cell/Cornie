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

// BE-05：模型调用失败分类（供 telemetry outcome.status 与错误码使用）。
export function classifyModelError(error) {
  const name = error?.name
  const kind = error?.kind
  const message = String(error?.message || error || '')
  if (name === 'AbortError' || kind === 'aborted' || error?.code === 'aborted') {
    return { status: 'aborted', errorCode: 'aborted' }
  }
  if (kind === 'timeout' || /timeout/i.test(message)) {
    return { status: 'timeout', errorCode: 'timeout' }
  }
  if (kind === 'protocol' || error?.code === 'invalid_model_protocol') {
    return { status: 'protocol_failed', errorCode: 'protocol_failed' }
  }
  if (kind === 'network' || error instanceof TypeError) {
    return { status: 'network_error', errorCode: 'network_error' }
  }
  return { status: 'network_error', errorCode: 'unknown_error' }
}

// BE-05：失败路径埋点——chat 抛错（超时/断网/缺 key/协议失败）时调用，不再零记录。
export function recordModelFailureTelemetry(
  telemetry,
  { phase = 'model_call', attempt = 1, error } = {}
) {
  if (!telemetry) {
    return
  }
  const classification = classifyModelError(error)
  telemetry.model.callCount += 1
  telemetry.model.calls.push({
    phase,
    attempt: Number(attempt ?? 1),
    error: classification.status,
    errorCode: classification.errorCode,
    errorMessage: String(error?.message || error || '')
  })
  telemetry.failure = classification
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
    finalReplyChars: String(outcome.finalReply ?? '').length,
    status: telemetry.failure?.status ?? 'ok',
    errorCode: telemetry.failure?.errorCode ?? null
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
