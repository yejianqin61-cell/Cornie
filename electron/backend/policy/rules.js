import { getTool } from '../tools/registry.js'
import { resolveCategoryCandidates } from '../category/mapping.js'
import { logCategoryAudit } from '../category/audit.js'
import { categoryDomainRegistry } from '../category/domainRegistry.js'
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
  const registration = categoryDomainRegistry.getDomain(domain)
  if (!store || !registration) {
    return []
  }
  return registration.getCategoryLists(store, { toolName })
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
  const registration = categoryDomainRegistry.getDomain(domain)
  if (!registration) {
    return {
      decision: 'deny',
      reason: `类目域 "${domain}" 尚未注册`,
      toolCall
    }
  }

  const { categoryId, categoryName, needsNewCategory, proposedCategoryName } = getCategoryMapping(toolCall)
  const domainLabel = registration.label ?? domain
  const domainCopy = registration.categoryRuleCopy ?? {}

  if (!categoryId && !categoryName && !needsNewCategory) {
    return buildCategoryAskBack(
      toolCall,
      missingQuestion,
      domainCopy.missingReason ?? `还缺少这个${domainLabel}应归属的类目信息。`,
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

function applyLegacyMemoryDeprecationRule(toolCall) {
  if (!toolCall.tool_name.startsWith('memory.')) {
    return null
  }

  return {
    decision: 'deny',
    reason: '旧 memory 工具集已经退场，长期记忆请改用 Memory Wiki / Memory Governance 相关工具。',
    toolCall
  }
}

function applyLedgerRule(toolCall, sourceText, options = {}) {
  const registration = categoryDomainRegistry.getDomainByActionTool(toolCall.tool_name)
  if (registration?.domain !== 'ledger') {
    return null
  }

  const validationDecision = registration.validateToolCall?.(toolCall, sourceText, options)
  if (validationDecision) {
    return validationDecision
  }

  const copy = registration.categoryRuleCopy ?? {}
  return applyCandidateResolution({
    store: options.store,
    toolCall,
    sourceText,
    domain: registration.domain,
    missingQuestion: copy.missingQuestion,
    vagueNameQuestion: copy.vagueNameQuestion,
    vagueNameReason: copy.vagueNameReason,
    createConfirmReason: copy.createConfirmReason
  })
}

function applyTodoRule(toolCall, sourceText, options = {}) {
  const registration = categoryDomainRegistry.getDomainByActionTool(toolCall.tool_name)
  if (registration?.domain !== 'todo') {
    return null
  }

  const copy = registration.categoryRuleCopy ?? {}
  return applyCandidateResolution({
    store: options.store,
    toolCall,
    sourceText,
    domain: registration.domain,
    missingQuestion: copy.missingQuestion,
    vagueNameQuestion: copy.vagueNameQuestion,
    vagueNameReason: copy.vagueNameReason,
    createConfirmReason: copy.createConfirmReason
  })
}

function applyScheduleRule(toolCall, sourceText, options = {}) {
  const registration = categoryDomainRegistry.getDomainByActionTool(toolCall.tool_name)
  if (registration?.domain !== 'schedule') {
    return null
  }

  const copy = registration.categoryRuleCopy ?? {}
  return applyCandidateResolution({
    store: options.store,
    toolCall,
    sourceText,
    domain: registration.domain,
    missingQuestion: copy.missingQuestion,
    vagueNameQuestion: copy.vagueNameQuestion,
    vagueNameReason: copy.vagueNameReason,
    createConfirmReason: copy.createConfirmReason
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

function applyMemoryWikiRule(toolCall, sourceText) {
  if (!toolCall.tool_name.startsWith('memory_wiki.') && !toolCall.tool_name.startsWith('memory_index.')) {
    return null
  }

  if (
    toolCall.tool_name === 'memory_wiki.get_page' ||
    toolCall.tool_name === 'memory_wiki.list_pages' ||
    toolCall.tool_name === 'memory_wiki.search_topic_index' ||
    toolCall.tool_name === 'memory_wiki.list_topic_index'
  ) {
    return {
      decision: 'allow',
      toolCall
    }
  }

  if (toolCall.tool_name === 'memory_wiki.merge_pages') {
    const targetPageId = normalizeString(toolCall.arguments?.targetPageId)
    const sourcePageId = normalizeString(toolCall.arguments?.sourcePageId)
    if (!targetPageId || !sourcePageId) {
      return {
        decision: 'ask_back',
        question: '你想合并哪两个长期记忆页面？小铃湾还缺少目标页或源页信息。',
        reason: 'memory wiki merge pages requires both targetPageId and sourcePageId',
        toolCall
      }
    }
    if (targetPageId === sourcePageId) {
      return {
        decision: 'deny',
        reason: '长期记忆页面不能把自己合并到自己。',
        toolCall
      }
    }
  }

  if (toolCall.tool_name === 'memory_wiki.rollback_page') {
    const pageId = normalizeString(toolCall.arguments?.pageId)
    const versionId = normalizeString(toolCall.arguments?.versionId)
    if (!pageId || !versionId) {
      return {
        decision: 'ask_back',
        question: '你想回滚哪一个页面、回到哪个版本？小铃湾还缺少页面或版本信息。',
        reason: 'memory wiki rollback requires pageId and versionId',
        toolCall
      }
    }
  }

  if (toolCall.tool_name === 'memory_index.link_page') {
    const normalizedKey = normalizeString(toolCall.arguments?.normalizedKey)
    const pageId = normalizeString(toolCall.arguments?.pageId)
    if (!normalizedKey || !pageId) {
      return {
        decision: 'ask_back',
        question: '你想把哪个主题索引关联到哪个页面？小铃湾还缺少主题键或页面信息。',
        reason: 'memory index link page requires normalizedKey and pageId',
        toolCall
      }
    }
  }

  const confirmMessageMap = {
    'memory_wiki.create_page': '长期记忆页面创建会影响后续很多轮对话，需要主人确认是否写入。',
    'memory_wiki.merge_pages': '长期记忆页面合并会改变记忆结构，需要主人确认是否合并。',
    'memory_wiki.rollback_page': '长期记忆页面回滚会恢复旧版本，需要主人确认是否回滚。',
    'memory_wiki.archive_page': '长期记忆页面归档会影响后续默认使用范围，需要主人确认。',
    'memory_wiki.set_status': '长期记忆页面状态调整属于高风险治理动作，需要主人确认。',
    'memory_wiki.set_importance': '长期记忆页面重要性调整会影响后续优先级，需要主人确认。',
    'memory_index.link_page': '主题索引页面绑定会改变长期记忆关联，需要主人确认。',
    'memory_index.update_aliases': '主题索引别名调整会影响主题归一化结果，需要主人确认。'
  }

  return {
    decision: 'confirm',
    confirmRequest: buildConfirmRequest(
      toolCall,
      confirmMessageMap[toolCall.tool_name] ?? '长期记忆 wiki 的写入、治理或索引修改属于高风险动作，需要主人确认。',
      sourceText
    ),
    toolCall
  }
}

function applySystemReadRule(toolCall) {
  if (
    toolCall.tool_name === 'settings.get_runtime_context' ||
    toolCall.tool_name === 'health.get_model_status' ||
    toolCall.tool_name === 'conversation.get_day_record' ||
    toolCall.tool_name === 'conversation.search_day_records' ||
    toolCall.tool_name === 'observation.get_day_record'
  ) {
    return {
      decision: 'allow',
      toolCall
    }
  }
  return null
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
    applyLegacyMemoryDeprecationRule(toolCall) ??
    toolNotRegistered(toolCall) ??
    applyLedgerRule(toolCall, sourceText, options) ??
    applyTodoRule(toolCall, sourceText, options) ??
    applyScheduleRule(toolCall, sourceText, options) ??
    applySystemReadRule(toolCall) ??
    applyMemoryRule(toolCall, sourceText) ??
    applyMemoryWikiRule(toolCall, sourceText) ??
    applyHighRiskRule(toolCall, sourceText) ?? {
      decision: 'allow',
      toolCall
    }
  )
}
