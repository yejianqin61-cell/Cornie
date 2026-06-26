import {
  getTodoCategory,
  listTodoCategories,
  listTodoEntries,
  updateTodoEntryStatus,
  saveTodoEntry,
  upsertTodoCategory
} from '../../db.js'
import { normalizeCategoryMapping } from '../category/mapping.js'
import { validateCategoryName } from '../category/validation.js'

function normalizeTodoInput(input) {
  const categoryMapping = normalizeCategoryMapping(input)

  return {
    title: String(input.title ?? '').trim(),
    description: input.description ?? null,
    categoryId: categoryMapping.categoryId,
    categoryName: categoryMapping.categoryName,
    needsNewCategory: categoryMapping.needsNewCategory,
    proposedCategoryName: categoryMapping.proposedCategoryName,
    dueAt: input.due_at ?? input.dueAt ?? null,
    sourceText: input.source_text ?? input.sourceText ?? null
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
      const todo = normalizeTodoInput(input)
      if (!input.id) throw new Error('todo id is required')
      return saveTodoEntry(store, {
        id: input.id,
        ...todo,
        status: input.status ?? 'pending'
      })
    },
    complete: ({ id }) => updateTodoEntryStatus(store, { id, status: 'done' }),
    delete: ({ id }) => updateTodoEntryStatus(store, { id, status: 'cancelled' }),
    get: (id) => getTodoCategory(store, id),
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
