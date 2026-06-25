import { evaluateToolRule } from './rules.js'

function buildPolicySummary(decisions) {
  const firstConfirm = decisions.find((item) => item.decision === 'confirm')
  if (firstConfirm) {
    return {
      decision: 'confirm',
      confirmRequest: firstConfirm.confirmRequest,
      decisions
    }
  }

  const firstAskBack = decisions.find((item) => item.decision === 'ask_back')
  if (firstAskBack) {
    return {
      decision: 'ask_back',
      question: firstAskBack.question,
      reason: firstAskBack.reason,
      decisions
    }
  }

  const firstDeny = decisions.find((item) => item.decision === 'deny')
  if (firstDeny) {
    return {
      decision: 'deny',
      reason: firstDeny.reason,
      decisions
    }
  }

  return {
    decision: 'allow',
    toolCalls: decisions.map((item) => item.toolCall),
    decisions
  }
}

export function evaluateToolCalls(toolCalls, { sourceText } = {}) {
  const decisions = toolCalls.map((toolCall) => evaluateToolRule(toolCall, sourceText))
  return buildPolicySummary(decisions)
}
