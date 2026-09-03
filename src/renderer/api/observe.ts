import { apiFetch } from './shared'

export interface ObservationPayload {
  date?: string
  type?: string
  content?: string
  [key: string]: unknown
}

export interface ObservationListQuery {
  date?: string
  from?: string
  to?: string
  type?: string
  q?: string
  limit?: number
}

export interface ObservationRecallQuery extends ObservationListQuery {
  topic?: string
  person?: string
}

export async function listObservations({
  date,
  from,
  to,
  type,
  q,
  limit,
  signal,
}: ObservationListQuery & { signal?: AbortSignal | null } = {}): Promise<unknown> {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (type) params.set('type', type)
  if (q) params.set('q', q)
  if (limit) params.set('limit', String(limit))
  const qs = params.toString()
  return apiFetch(`/observations${qs ? `?${qs}` : ''}`, { signal })
}

export async function recallObservations({
  date,
  from,
  to,
  type,
  q,
  topic,
  person,
  limit,
}: ObservationRecallQuery = {}): Promise<unknown> {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (type) params.set('type', type)
  if (q) params.set('q', q)
  if (topic) params.set('topic', topic)
  if (person) params.set('person', person)
  if (limit) params.set('limit', String(limit))
  const qs = params.toString()
  return apiFetch(`/observations/recall${qs ? `?${qs}` : ''}`)
}

export async function getObservation(id: string, { signal }: { signal?: AbortSignal | null } = {}): Promise<unknown> {
  return apiFetch(`/observations/${encodeURIComponent(id)}`, { signal })
}

export async function createObservation(payload: ObservationPayload): Promise<unknown> {
  return apiFetch('/observations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateObservation(id: string, payload: ObservationPayload): Promise<unknown> {
  return apiFetch(`/observations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteObservation(id: string): Promise<unknown> {
  return apiFetch(`/observations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
