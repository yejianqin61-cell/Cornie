import { apiGet, apiPost, apiPut, apiDelete } from './client.js'

export async function listEntries(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  const result = await apiGet(`/api/ledger/entries${s ? `?${s}` : ''}`)
  return {
    ...result,
    entries: (result.items || []).map((entry) => ({
      ...entry,
      category: entry.categoryName || '',
      date: String(entry.occurredAt || '').slice(0, 10),
      note: entry.item || '',
    })),
  }
}

export function listLedgerCategories({ type } = {}) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : ''
  return apiGet(`/api/ledger/categories${qs}`)
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
