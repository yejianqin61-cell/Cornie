import { apiGet, apiPost, apiPut, apiDelete } from './client.js'

export function listTodos(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return apiGet(`/api/todos${s ? `?${s}` : ''}`)
}

export function getTodo(id) {
  return apiGet(`/api/todos/${id}`)
}

export function createTodo(body) {
  return apiPost('/api/todos', body)
}

export function updateTodo(id, body) {
  return apiPut(`/api/todos/${id}`, body)
}

export function completeTodo(id) {
  return apiPost(`/api/todos/${id}/complete`)
}

export function reopenTodo(id) {
  return apiPost(`/api/todos/${id}/reopen`)
}

export function deleteTodo(id) {
  return apiDelete(`/api/todos/${id}`)
}