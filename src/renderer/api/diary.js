import { apiGet, apiPost, apiPut } from './client.js'

export function listEntries({ month } = {}) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiGet(`/api/entries${qs}`)
}

export function getEntry(date) {
  return apiGet(`/api/entries/${date}`)
}

export function upsertEntry(date, { userText, cornieText } = {}) {
  return apiPut(`/api/entries/${date}`, { userText, cornieText })
}

export function regenerateCornie(date) {
  return apiPost(`/api/entries/${date}/regenerate-cornie`)
}

export function getOnThisDay(date, limit) {
  const params = new URLSearchParams()
  if (limit) params.set('limit', String(limit))
  const qs = params.toString() ? `?${params}` : ''
  return apiGet(`/api/entries/${date}/on-this-day${qs}`)
}