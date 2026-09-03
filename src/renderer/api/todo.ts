import { apiFetch } from './shared'

export interface TodoPayload {
  title?: string
  date?: string
  dueDate?: string | null
  categoryId?: string | null
  categoryName?: string | null
  note?: string | null
  status?: string
  [key: string]: unknown
}

export interface TodoCategoryPayload {
  name?: string
  sortOrder?: number
  [key: string]: unknown
}

export async function listTodos({
  view,
  from,
  to,
}: { view?: string; from?: string; to?: string } = {}): Promise<unknown> {
  const params = new URLSearchParams()
  if (view) params.set('view', view)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return apiFetch(`/todos${qs ? `?${qs}` : ''}`)
}

export async function getTodo(id: string): Promise<unknown> {
  return apiFetch(`/todos/${encodeURIComponent(id)}`)
}

export async function createTodo(payload: TodoPayload): Promise<unknown> {
  return apiFetch('/todos', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateTodo(id: string, payload: TodoPayload): Promise<unknown> {
  return apiFetch(`/todos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function completeTodo(id: string): Promise<unknown> {
  return apiFetch(`/todos/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
  })
}

export async function reopenTodo(id: string): Promise<unknown> {
  return apiFetch(`/todos/${encodeURIComponent(id)}/reopen`, {
    method: 'POST',
  })
}

export async function deleteTodo(id: string): Promise<unknown> {
  return apiFetch(`/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function listTodoCategories(): Promise<unknown> {
  return apiFetch('/todo-categories')
}

export async function getTodoCategory(id: string): Promise<unknown> {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}`)
}

export async function createTodoCategory(payload: TodoCategoryPayload): Promise<unknown> {
  return apiFetch('/todo-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateTodoCategory(id: string, payload: TodoCategoryPayload): Promise<unknown> {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function restoreTodoCategory(id: string): Promise<unknown> {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  })
}

export async function reorderTodoCategory(id: string, sortOrder: number): Promise<unknown> {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ sortOrder }),
  })
}
