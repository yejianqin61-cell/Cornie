import { getTool } from '../tools/registry.js'
import { getToolRiskLevel } from './riskLevels.js'

function buildConfirmRequest(toolCall, reason, sourceText) {
  return {
    kind: 'tool_confirmation',
    toolName: toolCall.tool_name,
    arguments: toolCall.arguments,
    reason,
    sourceText
  }
}

function toolNotRegistered(toolCall) {
  if (getTool(toolCall.tool_name)) {
    return null
  }

  return {
    decision: 'deny',
    reason: `工具 "${toolCall.tool_name}" 尚未接入`,
    toolCall
  }
}

function applyFinancialRule(toolCall, sourceText) {
  if (!toolCall.tool_name.startsWith('ledger.')) {
    return null
  }

  const amount = toolCall.arguments?.amount
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return {
      decision: 'ask_back',
      question: '这笔收支的金额是多少呀？小铃湾需要确认后才能记下。',
      reason: 'missing_amount',
      toolCall
    }
  }

  const categoryId = toolCall.arguments?.categoryId
  const categoryName = toolCall.arguments?.categoryName
  const needsNewCategory = toolCall.arguments?.needsNewCategory === true

  if (!categoryId && !categoryName && !needsNewCategory) {
    return {
      decision: 'ask_back',
      question: '这笔收支想归到哪个类目呢？如果没有合适类目，小铃湾可以先帮你提请新增。',
      reason: 'missing_category_mapping',
      toolCall
    }
  }

  if (needsNewCategory) {
    return {
      decision: 'confirm',
      confirmRequest: buildConfirmRequest(
        toolCall,
        '当前收支找不到合适类目，建议先新增类目，等待主人确认。',
        sourceText
      ),
      toolCall
    }
  }

  return null
}

function applyMemoryRule(toolCall, sourceText) {
  if (!toolCall.tool_name.startsWith('memory.')) {
    return null
  }

  return {
    decision: 'confirm',
    confirmRequest: buildConfirmRequest(
      toolCall,
      '长期记忆写入属于高风险动作，需要主人确认。',
      sourceText
    ),
    toolCall
  }
}

function applyHighRiskRule(toolCall, sourceText) {
  if (getToolRiskLevel(toolCall.tool_name) !== 'high') {
    return null
  }

  return {
    decision: 'confirm',
    confirmRequest: buildConfirmRequest(
      toolCall,
      '这个动作风险较高，小铃湾想先征得主人的同意。',
      sourceText
    ),
    toolCall
  }
}

export function evaluateToolRule(toolCall, sourceText) {
  return (
    toolNotRegistered(toolCall) ??
    applyFinancialRule(toolCall, sourceText) ??
    applyMemoryRule(toolCall, sourceText) ??
    applyHighRiskRule(toolCall, sourceText) ?? {
      decision: 'allow',
      toolCall
    }
  )
}
