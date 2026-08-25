import { apiFetch } from './shared.js'

export async function listObservations({ date, from, to, type, q, limit, signal } = {}) {
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

export async function recallObservations({ date, from, to, type, q, topic, person, limit } = {}) {
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

export async function getObservation(id) {
  return apiFetch(`/observations/${encodeURIComponent(id)}`)
}

export async function createObservation(payload) {
  return apiFetch('/observations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateObservation(id, payload) {
  return apiFetch(`/observations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteObservation(id) {
  return apiFetch(`/observations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
