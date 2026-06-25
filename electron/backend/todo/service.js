import {
  getTodoCategory,
  listTodoCategories,
  listTodoEntries,
  updateTodoEntryStatus,
  saveTodoEntry,
  upsertTodoCategory
} from '../../db.js'

function normalizeTodoInput(input) {
  return {
    title: String(input.title ?? '').trim(),
    description: input.description ?? null,
    categoryId: input.category_id ?? input.categoryId ?? null,
    categoryName: input.category_name ?? input.categoryName ?? null,
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
    createCategory: ({ name, id, sortOrder = 0 }) =>
      upsertTodoCategory(store, { name, id, sortOrder }),
    updateCategory: ({ id, name, isActive, sortOrder }) =>
      upsertTodoCategory(store, { id, name, isActive, sortOrder })
  }
}
