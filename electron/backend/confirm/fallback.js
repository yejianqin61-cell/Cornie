import { resolveCategoryCandidates } from '../category/mapping.js'
import { createLedgerService } from '../ledger/service.js'
import { createTodoService } from '../todo/service.js'
import { createScheduleService } from '../schedule/service.js'

function getCategoryLists(store, domain, toolName) {
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

function buildResolutionReason(domain, mode) {
  if (mode === 'suggest_existing_category') {
    return domain === 'ledger'
      ? '主人拒绝新增后，建议改用现有收支类目。'
      : domain === 'todo'
        ? '主人拒绝新增后，建议改用现有待办类目。'
        : '主人拒绝新增后，建议改用现有日程类目。'
  }

  if (mode === 'ask_user_pick_existing') {
    return domain === 'ledger'
      ? '主人拒绝新增后，已有多个接近的收支类目，需要主人手动挑一个。'
      : domain === 'todo'
        ? '主人拒绝新增后，已有多个接近的待办类目，需要主人手动挑一个。'
        : '主人拒绝新增后，已有多个接近的日程类目，需要主人手动挑一个。'
  }

  return '主人拒绝新增后，本次不继续写入。'
}

export function deriveCategoryRejectResolution(store, confirmation) {
  if (confirmation?.confirmRequest?.kind !== 'category_creation_confirmation') {
    return {
      mode: 'closed_without_write',
      reason: '当前确认请求不属于新增类目场景，本次不会继续写入。',
      candidates: []
    }
  }

  const { domain, proposedCategoryName, pendingAction } = confirmation.confirmRequest
  const categories = getCategoryLists(store, domain, pendingAction?.toolName)

  const matchResult = resolveCategoryCandidates(
    categories,
    {
      categoryName: proposedCategoryName,
      sourceText: confirmation.sourceText ?? confirmation.confirmRequest?.sourceText ?? ''
    },
    domain
  )

  const candidates = Array.isArray(matchResult?.candidates)
    ? matchResult.candidates.map((item) => ({
        id: item.id,
        name: item.name,
        score: item.score,
        reason: item.reason
      }))
    : []

  if (candidates.length === 0 || !matchResult?.selectedCandidate || matchResult.confidence < 0.55) {
    return {
      mode: 'closed_without_write',
      reason: buildResolutionReason(domain, 'closed_without_write'),
      candidates: []
    }
  }

  if (candidates.length === 1) {
    return {
      mode: 'suggest_existing_category',
      suggestedCategoryId: matchResult.selectedCandidate.id,
      suggestedCategoryName: matchResult.selectedCandidate.name,
      confidence: matchResult.confidence,
      reason: buildResolutionReason(domain, 'suggest_existing_category'),
      candidates
    }
  }

  return {
    mode: 'ask_user_pick_existing',
    reason: buildResolutionReason(domain, 'ask_user_pick_existing'),
    candidates
  }
}

export function buildCategoryRejectFollowupConfirmRequest(confirmation, resolution) {
  if (resolution?.mode !== 'suggest_existing_category') {
    return null
  }

  return {
    kind: 'category_mapping_confirmation',
    title: '需要确认：改用已有类目',
    toolName: confirmation.confirmRequest?.toolName,
    domain: confirmation.confirmRequest?.domain,
    sourceText: confirmation.sourceText,
    reason: `不新增“${confirmation.confirmRequest?.proposedCategoryName}”的话，小铃湾建议改用现有类目“${resolution.suggestedCategoryName}”。`,
    confidence: resolution.confidence ?? null,
    recommendedCategory: {
      id: resolution.suggestedCategoryId,
      name: resolution.suggestedCategoryName
    },
    similarCandidates: resolution.candidates ?? [],
    pendingAction: confirmation.confirmRequest?.pendingAction,
    details: [
      `原建议新增：${confirmation.confirmRequest?.proposedCategoryName || '未提供'}`,
      `推荐改用：${resolution.suggestedCategoryName}`,
      typeof resolution.confidence === 'number' ? `命中置信度：${resolution.confidence}` : null
    ].filter(Boolean)
  }
}
