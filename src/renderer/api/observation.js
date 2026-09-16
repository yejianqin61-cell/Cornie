import { apiGet, apiPost, apiPut, apiDelete } from './client.js'

export function listObservations(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return apiGet(`/api/observations${s ? `?${s}` : ''}`)
}

export function getObservation(id) {
  return apiGet(`/api/observations/${id}`)
}

export function createObservation(body) {
  return apiPost('/api/observations', body)
}

export function updateObservation(id, body) {
  return apiPut(`/api/observations/${id}`, body)
}

export function deleteObservation(id) {
  return apiDelete(`/api/observations/${id}`)
}