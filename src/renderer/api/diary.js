import { apiFetch } from './shared.js'

export async function listEntries({ month } = {}) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiFetch(`/entries${qs}`)
}

export async function getEntry(date, { signal } = {}) {
  return apiFetch(`/entries/${encodeURIComponent(date)}`, { signal })
}

export async function upsertEntry(date, payload) {
  return apiFetch(`/entries/${encodeURIComponent(date)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function regenerateCornie(date) {
  return apiFetch(`/entries/${encodeURIComponent(date)}/regenerate-cornie`, {
    method: 'POST',
  })
}

export async function listOnThisDay(date, { limit } = {}) {
  const qs = limit ? `?limit=${encodeURIComponent(String(limit))}` : ''
  return apiFetch(`/entries/${encodeURIComponent(date)}/on-this-day${qs}`)
}
