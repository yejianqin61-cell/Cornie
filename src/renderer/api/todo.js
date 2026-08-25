import { apiFetch } from './shared.js'

export async function listTodos({ view, from, to } = {}) {
  const params = new URLSearchParams()
  if (view) params.set('view', view)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return apiFetch(`/todos${qs ? `?${qs}` : ''}`)
}

export async function getTodo(id) {
  return apiFetch(`/todos/${encodeURIComponent(id)}`)
}

export async function createTodo(payload) {
  return apiFetch('/todos', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateTodo(id, payload) {
  return apiFetch(`/todos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function completeTodo(id) {
  return apiFetch(`/todos/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
  })
}

export async function reopenTodo(id) {
  return apiFetch(`/todos/${encodeURIComponent(id)}/reopen`, {
    method: 'POST',
  })
}

export async function deleteTodo(id) {
  return apiFetch(`/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function listTodoCategories() {
  return apiFetch('/todo-categories')
}

export async function getTodoCategory(id) {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}`)
}

export async function createTodoCategory(payload) {
  return apiFetch('/todo-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateTodoCategory(id, payload) {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function restoreTodoCategory(id) {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  })
}

export async function reorderTodoCategory(id, sortOrder) {
  return apiFetch(`/todo-categories/${encodeURIComponent(id)}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ sortOrder }),
  })
}
