import {
  getTodoCategory,
  getTodoEntry,
  listTodoCategories,
  listTodoEntries,
  updateTodoEntryStatus,
  saveTodoEntry,
  upsertTodoCategory
} from '../../db.js'
import { normalizeCategoryMapping } from '../category/mapping.js'
import { validateCategoryName } from '../category/validation.js'

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

function normalizeTodoInput(input, { existing = null } = {}) {
  const categoryMapping = normalizeCategoryMapping(input)
  const title = hasOwn(input, 'title')
    ? String(input.title ?? '').trim()
    : existing?.title ?? ''
  const description = hasOwn(input, 'description')
    ? input.description ?? null
    : existing?.description ?? null
  const dueAt =
    hasOwn(input, 'dueAt') || hasOwn(input, 'due_at')
      ? input.due_at ?? input.dueAt ?? null
      : existing?.dueAt ?? null
  const sourceText =
    hasOwn(input, 'sourceText') || hasOwn(input, 'source_text')
      ? input.source_text ?? input.sourceText ?? null
      : existing?.sourceText ?? null
  const useExistingCategory = !hasCategoryFields(input) && existing

  return {
    title,
    description,
    categoryId: useExistingCategory ? existing.categoryId ?? null : categoryMapping.categoryId,
    categoryName: useExistingCategory ? existing.categoryName ?? null : categoryMapping.categoryName,
    needsNewCategory: categoryMapping.needsNewCategory,
    proposedCategoryName: categoryMapping.proposedCategoryName,
    dueAt,
    sourceText
  }
}

export function createTodoService(store) {
  return {
    create: (input) => {
      const todo = normalizeTodoInput(input)
      if (!todo.title) throw new Error('todo title is required')
      return saveTodoEntry(store, {
        ...todo,
        status: 'pending'
      })
    },
    update: (input) => {
      if (!input.id) throw new Error('todo id is required')
      const existing = getTodoEntry(store, input.id)
      if (!existing) throw new Error('todo entry not found')
      const todo = normalizeTodoInput(input, { existing })
      if (!todo.title) throw new Error('todo title is required')
      return saveTodoEntry(store, {
        id: input.id,
        ...todo,
        status: input.status ?? existing.status ?? 'pending'
      })
    },
    complete: ({ id }) => updateTodoEntryStatus(store, { id, status: 'done' }),
    delete: ({ id }) => updateTodoEntryStatus(store, { id, status: 'cancelled' }),
    get: (id) => getTodoEntry(store, id),
    listToday: () => listTodoEntries(store, { status: 'pending' }),
    listByRange: ({ from, to }) => listTodoEntries(store, { from, to }),
    listCategories: () => listTodoCategories(store),
    createCategory: ({ name, id, sortOrder = 0 }) => {
      const validation = validateCategoryName(name, listTodoCategories(store))

      if (validation.duplicateCategoryId) {
        return {
          ...getTodoCategory(store, validation.duplicateCategoryId),
          resolution: 'reused_existing'
        }
      }

      if (!validation.ok) {
        const error = new Error(validation.reason || 'invalid category name')
        error.code = validation.similarCandidates?.length > 0 ? 'category_name_similar' : 'invalid_category_name'
        error.details = validation
        throw error
      }

      return upsertTodoCategory(store, { name: validation.normalizedName, id, sortOrder })
    },
    updateCategory: ({ id, name, isActive, sortOrder }) =>
      upsertTodoCategory(store, { id, name, isActive, sortOrder })
  }
}
