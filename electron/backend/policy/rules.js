import { getTool } from '../tools/registry.js'
import { resolveCategoryCandidates } from '../category/mapping.js'
import { logCategoryAudit } from '../category/audit.js'
import { createLedgerService } from '../ledger/service.js'
import { createTodoService } from '../todo/service.js'
import { createScheduleService } from '../schedule/service.js'
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

function buildCategoryCandidateNames(candidates = []) {
  return candidates
    .map((item) => item?.name)
    .filter(Boolean)
    .slice(0, 5)
}

function getCategoryLists(store, domain, toolName) {
  if (!store) {
    return []
  }

  if (domain === 'ledger') {
    const ledger = createLedgerService(store)
    return toolName === 'ledger.add_income'
      ? ledger.listIncomeCategories()
      : ledger.listExpenseCategories()
  }

  if (domain === 'todo') {
    return createTodoService(store).listCategories()
  }

  if (domain === 'schedule') {
    return createScheduleService(store).listCategories()
  }

  return []
}

function buildCategoryCreationConfirmRequest({
  toolCall,
  sourceText,
  domain,
  reason,
  proposedCategoryName,
  recommendedCategory = null,
  similarCandidates = [],
  confidence = null
}) {
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
    recommendedCategory,
    similarCandidates,
    confidence,
    reason,
    sourceText,
    pendingAction: {
      toolName: toolCall.tool_name,
      arguments: toolCall.arguments
    },
    details: [
      `所属域：${domainLabelMap[domain] ?? domain}`,
      `建议类目：${proposedCategoryName || '未提供'}`,
      `触发工具：${toolCall.tool_name}`,
      recommendedCategory?.name ? `推荐复用：${recommendedCategory.name}` : null,
      typeof confidence === 'number' ? `命中置信度：${confidence}` : null
    ].filter(Boolean)
  }
}

function getCategoryMapping(toolCall) {
  return {
    categoryId: normalizeString(toolCall.arguments?.categoryId),
    categoryName: normalizeString(toolCall.arguments?.categoryName),
    needsNewCategory: toolCall.arguments?.needsNewCategory === true,
    proposedCategoryName: normalizeString(toolCall.arguments?.proposedCategoryName),
    sourceText: normalizeString(toolCall.arguments?.sourceText)
  }
}

function buildCategoryAskBack(toolCall, question, reason, options = {}) {
  const domain = options.domain

  logCategoryAudit({
    eventType: 'category_mapping_ask_back',
    domain,
    toolName: toolCall.tool_name,
    sourceText: toolCall.arguments?.sourceText,
    categoryId: options.selectedCandidate?.id ?? null,
    categoryName: options.selectedCandidate?.name ?? null,
    proposedCategoryName: toolCall.arguments?.proposedCategoryName ?? null,
    similarCandidates: buildCategoryCandidateNames(options.candidates),
    decision: 'ask_back',
    reason
  })

  return {
    decision: 'ask_back',
    question,
    reason,
    toolCall
  }
}

function buildCategoryRecommendConfirm(toolCall, sourceText, domain, matchResult) {
  const selected = matchResult.selectedCandidate
  const similarCandidates = buildCategoryCandidateNames(matchResult.candidates)

  logCategoryAudit({
    eventType: 'category_mapping_needs_confirmation',
    domain,
    toolName: toolCall.tool_name,
    sourceText,
    categoryId: selected?.id ?? null,
    categoryName: selected?.name ?? null,
    similarCandidates,
    decision: 'confirm',
    reason: matchResult.reason
  })

  return {
    decision: 'confirm',
    confirmRequest: {
      kind: 'category_mapping_confirmation',
      title: '需要确认：类目候选存在歧义',
      toolName: toolCall.tool_name,
      domain,
      sourceText,
      reason: matchResult.reason,
      confidence: matchResult.confidence,
      recommendedCategory: selected
        ? {
            id: selected.id,
            name: selected.name
          }
        : null,
      similarCandidates: matchResult.candidates.map((item) => ({
        id: item.id,
        name: item.name,
        score: item.score,
        reason: item.reason
      })),
      pendingAction: {
        toolName: toolCall.tool_name,
        arguments: toolCall.arguments
      },
      details: [
        `所属域：${domain}`,
        selected?.name ? `推荐类目：${selected.name}` : null,
        typeof matchResult.confidence === 'number'
          ? `命中置信度：${matchResult.confidence}`
          : null
      ].filter(Boolean)
    },
    toolCall
  }
}

function buildCategoryCreationConfirm(
  toolCall,
  sourceText,
  domain,
  reason,
  proposedCategoryName,
  options = {}
) {
  const similarCandidates = buildCategoryCandidateNames(options.similarCandidates)

  logCategoryAudit({
    eventType: 'category_mapping_needs_confirmation',
    domain,
    toolName: toolCall.tool_name,
    sourceText,
    categoryId: options.recommendedCategory?.id ?? null,
    categoryName: options.recommendedCategory?.name ?? null,
    proposedCategoryName,
    similarCandidates,
    decision: 'confirm',
    reason
  })

  return {
    decision: 'confirm',
    confirmRequest: buildCategoryCreationConfirmRequest({
      toolCall,
      sourceText,
      domain,
      reason,
      proposedCategoryName,
      recommendedCategory: options.recommendedCategory,
      similarCandidates,
      confidence: options.confidence
    }),
    toolCall
  }
}

function buildResolvedAudit(toolCall, domain, sourceText, matchResult = null) {
  const selected = matchResult?.selectedCandidate
  logCategoryAudit({
    eventType: 'category_mapping_resolved',
    domain,
    toolName: toolCall.tool_name,
    sourceText,
    categoryId: selected?.id ?? normalizeString(toolCall.arguments?.categoryId),
    categoryName: selected?.name ?? normalizeString(toolCall.arguments?.categoryName),
    similarCandidates: buildCategoryCandidateNames(matchResult?.candidates),
    decision: 'mapped',
    reason: matchResult?.reason ?? null
  })
}

function applyResolvedCandidate(toolCall, matchResult) {
  if (!matchResult?.selectedCandidate) {
    return toolCall
  }

  return {
    ...toolCall,
    arguments: {
      ...(toolCall.arguments ?? {}),
      categoryId: matchResult.selectedCandidate.id,
      categoryName: matchResult.selectedCandidate.name
    }
  }
}

function matchExistingCategory(store, toolCall, sourceText, domain) {
  if (!store) {
    return null
  }

  const categories = getCategoryLists(store, domain, toolCall.tool_name)
  return resolveCategoryCandidates(
    categories,
    {
      ...(toolCall.arguments ?? {}),
      sourceText: toolCall.arguments?.sourceText ?? sourceText
    },
    domain
  )
}

function applyCandidateResolution({
  store,
  toolCall,
  sourceText,
  domain,
  missingQuestion,
  vagueNameQuestion,
  vagueNameReason,
  createConfirmReason
}) {
  const { categoryId, categoryName, needsNewCategory, proposedCategoryName } = getCategoryMapping(toolCall)

  if (!categoryId && !categoryName && !needsNewCategory) {
    return buildCategoryAskBack(
      toolCall,
      missingQuestion,
      `还缺少这个${domain === 'ledger' ? '收支' : domain === 'todo' ? '待办' : '日程'}应归属的类目信息。`,
      { domain }
    )
  }

  if (needsNewCategory && isVagueCategoryName(proposedCategoryName)) {
    return buildCategoryAskBack(toolCall, vagueNameQuestion, vagueNameReason, { domain })
  }

  const matchResult =
    !needsNewCategory && (categoryId || categoryName)
      ? matchExistingCategory(store, toolCall, sourceText, domain)
      : null

  if (!needsNewCategory && matchResult?.decisionHint === 'allow' && matchResult.selectedCandidate) {
    const resolvedToolCall = applyResolvedCandidate(toolCall, matchResult)
    buildResolvedAudit(resolvedToolCall, domain, sourceText, matchResult)
    return {
      decision: 'allow',
      toolCall: resolvedToolCall
    }
  }

  if (!needsNewCategory && matchResult?.decisionHint === 'confirm') {
    return buildCategoryRecommendConfirm(toolCall, sourceText, domain, matchResult)
  }

  if (!needsNewCategory && matchResult?.decisionHint === 'ask_back') {
    return buildCategoryAskBack(toolCall, missingQuestion, matchResult.reason, {
      domain,
      selectedCandidate: matchResult.selectedCandidate,
      candidates: matchResult.candidates
    })
  }

  if (needsNewCategory) {
    return buildCategoryCreationConfirm(
      toolCall,
      sourceText,
      domain,
      createConfirmReason,
      proposedCategoryName,
      {
        recommendedCategory: matchResult?.selectedCandidate ?? null,
        similarCandidates: matchResult?.candidates ?? [],
        confidence: matchResult?.confidence ?? null
      }
    )
  }

  if (categoryId || categoryName) {
    buildResolvedAudit(toolCall, domain, sourceText)
  }

  return null
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

function applyLedgerRule(toolCall, sourceText, options = {}) {
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

  return applyCandidateResolution({
    store: options.store,
    toolCall,
    sourceText,
    domain: 'ledger',
    missingQuestion: '这笔收支更像哪一类呀？如果现有类目都不合适，小铃湾也可以先帮你申请新增。',
    vagueNameQuestion: '如果要新增类目，这笔收支你想起一个更明确的类目名吗？比如“猫咪用品”这种，小铃湾才好帮你申请。',
    vagueNameReason: '建议新增的类目名还不够明确。',
    createConfirmReason: '当前收支找不到合适类目，建议先新增类目，等待主人确认。'
  })
}

function applyTodoRule(toolCall, sourceText, options = {}) {
  if (!['todo.create', 'todo.update'].includes(toolCall.tool_name)) {
    return null
  }

  return applyCandidateResolution({
    store: options.store,
    toolCall,
    sourceText,
    domain: 'todo',
    missingQuestion: '这个待办你希望放到哪个分类里呢？如果没有合适的，我也可以先帮你提请新增。',
    vagueNameQuestion: '如果要新增待办分类，你想给它起个更明确的名字吗？这样小铃湾才能更稳地帮你创建。',
    vagueNameReason: '建议新增的待办类目名还不够明确。',
    createConfirmReason: '当前待办找不到合适分类，建议先新增待办类目，等待主人确认。'
  })
}

function applyScheduleRule(toolCall, sourceText, options = {}) {
  if (!['schedule.create', 'schedule.update'].includes(toolCall.tool_name)) {
    return null
  }

  return applyCandidateResolution({
    store: options.store,
    toolCall,
    sourceText,
    domain: 'schedule',
    missingQuestion: '这个日程想归到哪个分类呀？如果没有现成的分类，小铃湾可以先帮你申请新增。',
    vagueNameQuestion: '如果要新增日程分类，这个名字还可以再具体一点吗？小铃湾想先确认得更稳一些。',
    vagueNameReason: '建议新增的日程类目名还不够明确。',
    createConfirmReason: '当前日程找不到合适分类，建议先新增日程类目，等待主人确认。'
  })
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

export function evaluateToolRule(toolCall, sourceText, options = {}) {
  return (
    toolNotRegistered(toolCall) ??
    applyLedgerRule(toolCall, sourceText, options) ??
    applyTodoRule(toolCall, sourceText, options) ??
    applyScheduleRule(toolCall, sourceText, options) ??
    applyMemoryRule(toolCall, sourceText) ??
    applyHighRiskRule(toolCall, sourceText) ?? {
      decision: 'allow',
      toolCall
    }
  )
}
