import { apiGet, apiPost, apiPut, apiDelete } from './client.js'

export function listEntries(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return apiGet(`/api/ledger/entries${s ? `?${s}` : ''}`)
}

export function getEntry(id) {
  return apiGet(`/api/ledger/entries/${id}`)
}

export function addExpense(body) {
  return apiPost('/api/ledger/entries/expense', body)
}

export function addIncome(body) {
  return apiPost('/api/ledger/entries/income', body)
}

export function updateEntry(id, body) {
  return apiPut(`/api/ledger/entries/${id}`, body)
}

export function deleteEntry(id) {
  return apiDelete(`/api/ledger/entries/${id}`)
}