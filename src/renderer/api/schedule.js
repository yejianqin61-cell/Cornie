import { apiFetch } from './shared.js'

export async function listSchedules({ view, from, to } = {}) {
  const params = new URLSearchParams()
  if (view) params.set('view', view)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return apiFetch(`/schedules${qs ? `?${qs}` : ''}`)
}

export async function getSchedule(id) {
  return apiFetch(`/schedules/${encodeURIComponent(id)}`)
}

export async function createSchedule(payload) {
  return apiFetch('/schedules', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateSchedule(id, payload) {
  return apiFetch(`/schedules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function cancelSchedule(id) {
  return apiFetch(`/schedules/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  })
}

export async function restoreSchedule(id) {
  return apiFetch(`/schedules/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  })
}

export async function deleteSchedule(id) {
  return apiFetch(`/schedules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function listScheduleCategories() {
  return apiFetch('/schedule-categories')
}

export async function getScheduleCategory(id) {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}`)
}

export async function createScheduleCategory(payload) {
  return apiFetch('/schedule-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateScheduleCategory(id, payload) {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function restoreScheduleCategory(id) {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  })
}

export async function reorderScheduleCategory(id, sortOrder) {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ sortOrder }),
  })
}
