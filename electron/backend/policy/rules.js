import { getTool } from '../tools/registry.js'
import { getToolRiskLevel } from './riskLevels.js'

const VAGUE_CATEGORY_NAMES = new Set([
  '其他',
  '其它',
  '别的',
  '默认',
  '杂项',
  '暂定',
  '这个',
  '那个',
  '新类目'
])

function normalizeString(value) {
  if (value == null) {
    return null
  }

  const normalized = String(value).trim()
  return normalized ? normalized : null
}

function isVagueCategoryName(name) {
  const normalized = normalizeString(name)
  if (!normalized) {
    return true
  }

  if (normalized.length < 2) {
    return true
  }

  if (VAGUE_CATEGORY_NAMES.has(normalized)) {
    return true
  }

  return normalized.length > 12
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
      reason: '还缺少这笔收支的金额信息。',
      toolCall
    }
  }

  const { categoryId, categoryName, needsNewCategory, proposedCategoryName } = getCategoryMapping(toolCall)
  if (!categoryId && !categoryName && !needsNewCategory) {
    return buildCategoryAskBack(
      toolCall,
      '这笔收支更像哪一类呀？如果现有类目都不合适，小铃湾也可以先帮你申请新增。',
      '还缺少这笔收支应归属的类目信息。'
    )
  }

  if (needsNewCategory && isVagueCategoryName(proposedCategoryName)) {
    return buildCategoryAskBack(
      toolCall,
      '如果要新增类目，这笔收支你想起一个更明确的类目名吗？比如“猫咪用品”这种，小铃湾才好帮你申请。',
      '建议新增的类目名还不够明确。'
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
      '这个待办你希望放到哪个分类里呢？如果没有合适的，我也可以先帮你提请新增。',
      '还缺少这个待办应归属的分类信息。'
    )
  }

  if (needsNewCategory && isVagueCategoryName(proposedCategoryName)) {
    return buildCategoryAskBack(
      toolCall,
      '如果要新增待办分类，你想给它起个更明确的名字吗？这样小铃湾才能更稳地帮你创建。',
      '建议新增的待办类目名还不够明确。'
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
      '这个日程想归到哪个分类呀？如果没有现成的分类，小铃湾可以先帮你申请新增。',
      '还缺少这个日程应归属的分类信息。'
    )
  }

  if (needsNewCategory && isVagueCategoryName(proposedCategoryName)) {
    return buildCategoryAskBack(
      toolCall,
      '如果要新增日程分类，这个名字还可以再具体一点吗？小铃湾想先确认得更稳一些。',
      '建议新增的日程类目名还不够明确。'
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
