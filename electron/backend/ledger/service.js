import { getLedgerCategory, listLedgerCategories, saveLedgerEntry, upsertLedgerCategory } from '../../db.js'

function normalizeLedgerInput(type, input) {
  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('amount is required')
  }

  return {
    type,
    amount: input.amount,
    currency: input.currency ?? 'CNY',
    categoryId: input.category_id ?? input.categoryId ?? null,
    categoryName: input.category_name ?? input.categoryName ?? null,
    merchant: input.merchant ?? null,
    item: input.item ?? null,
    sourceText: input.source_text ?? input.sourceText ?? null,
    occurredAt: input.occurred_at ?? input.occurredAt ?? new Date().toISOString(),
    confidence: input.confidence ?? null
  }
}

function listCategoriesByType(store, type) {
  return listLedgerCategories(store, { type })
}

function createCategory(store, { type, name, id, sortOrder }) {
  return upsertLedgerCategory(store, {
    id,
    type,
    name,
    sortOrder
  })
}

function addEntry(store, type, input) {
  const ledger = normalizeLedgerInput(type, input)
  return saveLedgerEntry(store, ledger)
}

export function createLedgerService(store) {
  return {
    addExpense: (input) => addEntry(store, 'expense', input),
    addIncome: (input) => addEntry(store, 'income', input),
    listExpenseCategories: () => listCategoriesByType(store, 'expense'),
    listIncomeCategories: () => listCategoriesByType(store, 'income'),
    createExpenseCategory: ({ name, id, sortOrder = 0 }) =>
      createCategory(store, { type: 'expense', name, id, sortOrder }),
    createIncomeCategory: ({ name, id, sortOrder = 0 }) =>
      createCategory(store, { type: 'income', name, id, sortOrder }),
    updateCategory: ({ id, type, name, isActive, sortOrder }) =>
      upsertLedgerCategory(store, { id, type, name, isActive, sortOrder }),
    getCategory: (id) => getLedgerCategory(store, id)
  }
}
