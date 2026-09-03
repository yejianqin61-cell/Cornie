import { apiFetch } from './shared'

export interface SchedulePayload {
  title?: string
  date?: string
  startAt?: string | null
  endAt?: string | null
  categoryId?: string | null
  categoryName?: string | null
  location?: string | null
  status?: string
  note?: string | null
  [key: string]: unknown
}

export interface ScheduleCategoryPayload {
  name?: string
  sortOrder?: number
  [key: string]: unknown
}

export async function listSchedules({
  view,
  from,
  to,
}: { view?: string; from?: string; to?: string } = {}): Promise<unknown> {
  const params = new URLSearchParams()
  if (view) params.set('view', view)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return apiFetch(`/schedules${qs ? `?${qs}` : ''}`)
}

export async function getSchedule(id: string): Promise<unknown> {
  return apiFetch(`/schedules/${encodeURIComponent(id)}`)
}

export async function createSchedule(payload: SchedulePayload): Promise<unknown> {
  return apiFetch('/schedules', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateSchedule(id: string, payload: SchedulePayload): Promise<unknown> {
  return apiFetch(`/schedules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function cancelSchedule(id: string): Promise<unknown> {
  return apiFetch(`/schedules/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  })
}

export async function restoreSchedule(id: string): Promise<unknown> {
  return apiFetch(`/schedules/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  })
}

export async function deleteSchedule(id: string): Promise<unknown> {
  return apiFetch(`/schedules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function listScheduleCategories(): Promise<unknown> {
  return apiFetch('/schedule-categories')
}

export async function getScheduleCategory(id: string): Promise<unknown> {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}`)
}

export async function createScheduleCategory(payload: ScheduleCategoryPayload): Promise<unknown> {
  return apiFetch('/schedule-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateScheduleCategory(id: string, payload: ScheduleCategoryPayload): Promise<unknown> {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function restoreScheduleCategory(id: string): Promise<unknown> {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  })
}

export async function reorderScheduleCategory(id: string, sortOrder: number): Promise<unknown> {
  return apiFetch(`/schedule-categories/${encodeURIComponent(id)}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ sortOrder }),
  })
}
