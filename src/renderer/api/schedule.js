import { apiGet, apiPost, apiPut, apiDelete } from './client.js'

export function listSchedules(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return apiGet(`/api/schedules${s ? `?${s}` : ''}`)
}

export function getSchedule(id) {
  return apiGet(`/api/schedules/${id}`)
}

export function createSchedule(body) {
  return apiPost('/api/schedules', body)
}

export function updateSchedule(id, body) {
  return apiPut(`/api/schedules/${id}`, body)
}

export function cancelSchedule(id) {
  return apiPost(`/api/schedules/${id}/cancel`)
}

export function restoreSchedule(id) {
  return apiPost(`/api/schedules/${id}/restore`)
}

export function deleteSchedule(id) {
  return apiDelete(`/api/schedules/${id}`)
}

export function listScheduleCategories({ includeInactive } = {}) {
  return apiGet(`/api/schedule-categories${includeInactive ? '?includeInactive=true' : ''}`)
}

export function createScheduleCategory(body) {
  return apiPost('/api/schedule-categories', body)
}

export function updateScheduleCategory(id, body) {
  return apiPut(`/api/schedule-categories/${id}`, body)
}

export function restoreScheduleCategory(id) {
  return apiPost(`/api/schedule-categories/${id}/restore`)
}

export function reorderScheduleCategory(id, sortOrder) {
  return apiPost(`/api/schedule-categories/${id}/reorder`, { sortOrder })
}
