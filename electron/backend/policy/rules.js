import { getTool } from '../tools/registry.js'
import { getToolRiskLevel } from './riskLevels.js'

function normalizeString(value) {
  if (value == null) {
    return null
  }

  const normalized = String(value).trim()
  return normalized ? normalized : null
}

function buildConfirmRequest(toolCall, reason, sourceText) {
  return {
    kind: 'tool_confirmation',
    toolName: toolCall.tool_name,
    arguments: toolCall.arguments,
    reason,
    sourceText
  }
}

function buildCategoryCreationConfirmRequest({ toolCall, sourceText, domain, reason, proposedCategoryName }) {
  const domainLabelMap = {
    ledger: '收支',
    todo: '待办',
    schedule: '日程'
  }

  return {
    kind: 'category_creation_confirmation',
    title: `需要确认：新增${domainLabelMap[domain] ?? '业务'}类目`,
    toolName: toolCall.tool_name,
    domain,
    proposedCategoryName,
    reason,
    sourceText,
    pendingAction: {
      toolName: toolCall.tool_name,
      arguments: toolCall.arguments
    },
    details: [
      `所属域：${domainLabelMap[domain] ?? domain}`,
      `建议类目：${proposedCategoryName || '未提供'}`,
      `触发工具：${toolCall.tool_name}`
    ]
  }
}

function getCategoryMapping(toolCall) {
  return {
    categoryId: normalizeString(toolCall.arguments?.categoryId),
    categoryName: normalizeString(toolCall.arguments?.categoryName),
    needsNewCategory: toolCall.arguments?.needsNewCategory === true,
    proposedCategoryName: normalizeString(toolCall.arguments?.proposedCategoryName)
  }
}

function buildCategoryAskBack(toolCall, question, reason) {
  return {
    decision: 'ask_back',
    question,
    reason,
    toolCall
  }
}

function buildCategoryConfirm(toolCall, sourceText, domain, reason, proposedCategoryName) {
  return {
    decision: 'confirm',
    confirmRequest: buildCategoryCreationConfirmRequest({
      toolCall,
      sourceText,
      domain,
      reason,
      proposedCategoryName
    }),
    toolCall
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

function applyLedgerRule(toolCall, sourceText) {
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

  const { categoryId, categoryName, needsNewCategory, proposedCategoryName } = getCategoryMapping(toolCall)
  if (!categoryId && !categoryName && !needsNewCategory) {
    return buildCategoryAskBack(
      toolCall,
      '这笔收支想归到哪个类目呢？如果没有合适类目，小铃湾可以先帮你提请新增。',
      'missing_category_mapping'
    )
  }

  if (needsNewCategory) {
    return buildCategoryConfirm(
      toolCall,
      sourceText,
      'ledger',
      '当前收支找不到合适类目，建议先新增类目，等待主人确认。',
      proposedCategoryName
    )
  }

  return null
}

function applyTodoRule(toolCall, sourceText) {
  if (!['todo.create', 'todo.update'].includes(toolCall.tool_name)) {
    return null
  }

  const { categoryId, categoryName, needsNewCategory, proposedCategoryName } = getCategoryMapping(toolCall)
  if (!categoryId && !categoryName && !needsNewCategory) {
    return buildCategoryAskBack(
      toolCall,
      '这个待办想放到哪个分类里呢？如果没有合适的，小铃湾可以先帮你提请新增。',
      'missing_todo_category_mapping'
    )
  }

  if (needsNewCategory) {
    return buildCategoryConfirm(
      toolCall,
      sourceText,
      'todo',
      '当前待办找不到合适分类，建议先新增待办类目，等待主人确认。',
      proposedCategoryName
    )
  }

  return null
}

function applyScheduleRule(toolCall, sourceText) {
  if (!['schedule.create', 'schedule.update'].includes(toolCall.tool_name)) {
    return null
  }

  const { categoryId, categoryName, needsNewCategory, proposedCategoryName } = getCategoryMapping(toolCall)
  if (!categoryId && !categoryName && !needsNewCategory) {
    return buildCategoryAskBack(
      toolCall,
      '这个日程想归到哪个分类呀？如果没有现成分类，小铃湾可以先帮你提请新增。',
      'missing_schedule_category_mapping'
    )
  }

  if (needsNewCategory) {
    return buildCategoryConfirm(
      toolCall,
      sourceText,
      'schedule',
      '当前日程找不到合适分类，建议先新增日程类目，等待主人确认。',
      proposedCategoryName
    )
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
    applyLedgerRule(toolCall, sourceText) ??
    applyTodoRule(toolCall, sourceText) ??
    applyScheduleRule(toolCall, sourceText) ??
    applyMemoryRule(toolCall, sourceText) ??
    applyHighRiskRule(toolCall, sourceText) ?? {
      decision: 'allow',
      toolCall
    }
  )
}
