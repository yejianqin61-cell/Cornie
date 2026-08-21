import {
  deleteLedgerEntry,
  getLedgerCategory,
  getLedgerEntry,
  listLedgerCategories,
  listLedgerEntriesByIds,
  listLedgerEntries,
  saveLedgerEntry,
  upsertLedgerCategory
} from '../../db.js'
import { normalizeCategoryMapping } from '../category/mapping.js'
import { validateCategoryName } from '../category/validation.js'
import { badRequest, HttpError } from '../http/errors.js'

function hasOwn(input, key) {
  return Object.prototype.hasOwnProperty.call(input, key)
}

function hasCategoryFields(input) {
  return [
    'categoryId',
    'category_id',
    'categoryName',
    'category_name',
    'needsNewCategory',
    'proposedCategoryName',
    'proposed_category_name',
    'categoryProposalName'
  ].some((key) => hasOwn(input, key))
}

function normalizeLedgerInput(type, input, { existing = null } = {}) {
  const categoryMapping = normalizeCategoryMapping(input)
  const amount = hasOwn(input, 'amount') ? input.amount : existing?.amount

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw badRequest('amount is required', undefined, 'amount_required')
  }

  const useExistingCategory = !hasCategoryFields(input) && existing

  return {
    type,
    amount,
    currency: hasOwn(input, 'currency') ? input.currency ?? 'CNY' : existing?.currency ?? 'CNY',
    categoryId: useExistingCategory ? existing.categoryId ?? null : categoryMapping.categoryId,
    categoryName: useExistingCategory ? existing.categoryName ?? null : categoryMapping.categoryName,
    needsNewCategory: categoryMapping.needsNewCategory,
    proposedCategoryName: categoryMapping.proposedCategoryName,
    merchant: hasOwn(input, 'merchant') ? input.merchant ?? null : existing?.merchant ?? null,
    item: hasOwn(input, 'item') ? input.item ?? null : existing?.item ?? null,
    sourceText:
      hasOwn(input, 'source_text') || hasOwn(input, 'sourceText')
        ? input.source_text ?? input.sourceText ?? null
        : existing?.sourceText ?? null,
    occurredAt:
      hasOwn(input, 'occurred_at') || hasOwn(input, 'occurredAt')
        ? input.occurred_at ?? input.occurredAt ?? new Date().toISOString()
        : existing?.occurredAt ?? new Date().toISOString(),
    confidence: hasOwn(input, 'confidence') ? input.confidence ?? null : existing?.confidence ?? null
  }
}

function listCategoriesByType(store, type) {
  return listLedgerCategories(store, { type })
}

function listAllCategories(store) {
  return listLedgerCategories(store, { activeOnly: false })
}

function createCategory(store, { type, name, id, sortOrder }) {
  const existingCategories = listCategoriesByType(store, type)
  const validation = validateCategoryName(name, existingCategories)

  if (validation.duplicateCategoryId) {
    return {
      ...getLedgerCategory(store, validation.duplicateCategoryId),
      resolution: 'reused_existing'
    }
  }

  if (!validation.ok) {
    const error = new HttpError(
      400,
      validation.reason || 'invalid category name',
      validation,
      validation.similarCandidates?.length > 0 ? 'category_name_similar' : 'invalid_category_name'
    )
    throw error
  }

  return upsertLedgerCategory(store, {
    id,
    type,
    name: validation.normalizedName,
    sortOrder
  })
}

function addEntry(store, type, input) {
  const ledger = normalizeLedgerInput(type, input)
  return saveLedgerEntry(store, ledger)
}

function buildDayRange(dateText) {
  const day =
    typeof dateText === 'string' && dateText.trim() ? dateText.trim() : new Date().toISOString().slice(0, 10)
  return {
    from: `${day}T00:00:00.000Z`,
    to: `${day}T23:59:59.999Z`
  }
}

export function createLedgerService(store) {
  return {
    addExpense: (input) => addEntry(store, 'expense', input),
    addIncome: (input) => addEntry(store, 'income', input),
    updateEntry: (input) => {
      if (!input?.id) throw badRequest('ledger entry id is required', undefined, 'entry_id_required')
      const existing = getLedgerEntry(store, input.id)
      if (!existing) throw new HttpError(404, 'ledger entry not found')

      const nextType = hasOwn(input, 'type') ? String(input.type ?? '').trim() : existing.type
      if (!['expense', 'income'].includes(nextType)) {
        throw badRequest('ledger entry type must be expense or income', undefined, 'invalid_entry_type')
      }

      const ledger = normalizeLedgerInput(nextType, input, { existing })
      return saveLedgerEntry(store, { id: input.id, ...ledger })
    },
    deleteEntry: ({ id }) => {
      if (!id) throw badRequest('ledger entry id is required', undefined, 'entry_id_required')
      const existing = getLedgerEntry(store, id)
      if (!existing) throw new HttpError(404, 'ledger entry not found')
      deleteLedgerEntry(store, id)
      return existing
    },
    getEntry: (id) => {
      if (!id) throw badRequest('ledger entry id is required', undefined, 'entry_id_required')
      return getLedgerEntry(store, id)
    },
    listByCategory: ({ categoryId, categoryName, type, from, to } = {}) => {
      const normalizedCategoryId = typeof categoryId === 'string' ? categoryId.trim() : ''
      const normalizedCategoryName = typeof categoryName === 'string' ? categoryName.trim() : ''
      const items = listLedgerEntries(store, { type, from, to })
      return items.filter((item) => {
        if (normalizedCategoryId && item.categoryId !== normalizedCategoryId) return false
        if (normalizedCategoryName && item.categoryName !== normalizedCategoryName) return false
        return true
      })
    },
    listRecent: ({ limit = 10, type } = {}) =>
      listLedgerEntries(store, { type }).slice(0, Math.max(1, Math.min(100, Number.parseInt(String(limit), 10) || 10))),
    listByIdBatch: ({ ids } = {}) => listLedgerEntriesByIds(store, ids),
    listToday: ({ date, type } = {}) => {
      const range = buildDayRange(date)
      return listLedgerEntries(store, { type, from: range.from, to: range.to })
    },
    listByRange: ({ from, to, type } = {}) => listLedgerEntries(store, { from, to, type }),
    listExpenseCategories: () => listCategoriesByType(store, 'expense'),
    listIncomeCategories: () => listCategoriesByType(store, 'income'),
    listAllCategories: () => listAllCategories(store),
    createExpenseCategory: ({ name, id, sortOrder = 0 }) =>
      createCategory(store, { type: 'expense', name, id, sortOrder }),
    createIncomeCategory: ({ name, id, sortOrder = 0 }) =>
      createCategory(store, { type: 'income', name, id, sortOrder }),
    restoreCategory: ({ id }) => {
      if (!id) throw badRequest('ledger category id is required', undefined, 'category_id_required')
      const existing = getLedgerCategory(store, id)
      if (!existing) throw new HttpError(404, 'ledger category not found')
      return upsertLedgerCategory(store, {
        id,
        type: existing.type,
        name: existing.name,
        sortOrder: existing.sortOrder,
        isActive: true
      })
    },
    updateCategory: ({ id, type, name, isActive, sortOrder }) =>
      upsertLedgerCategory(store, { id, type, name, isActive, sortOrder }),
    getCategory: (id) => {
      if (!id) throw badRequest('ledger category id is required', undefined, 'category_id_required')
      return getLedgerCategory(store, id)
    }
  }
}
