import { apiFetch } from './shared.js'

export async function listLedgerEntries({ from, to, type, categoryId, categoryName, recent, ids } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (type) params.set('type', type)
  if (categoryId) params.set('categoryId', categoryId)
  if (categoryName) params.set('categoryName', categoryName)
  if (recent !== undefined) params.set('recent', String(recent))
  if (Array.isArray(ids) && ids.length > 0) params.set('ids', ids.join(','))
  const qs = params.toString()
  return apiFetch(`/ledger/entries${qs ? `?${qs}` : ''}`)
}

export async function getLedgerEntry(id) {
  return apiFetch(`/ledger/entries/${encodeURIComponent(id)}`)
}

export async function createExpenseEntry(payload) {
  return apiFetch('/ledger/entries/expense', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function createIncomeEntry(payload) {
  return apiFetch('/ledger/entries/income', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateLedgerEntry(id, payload) {
  return apiFetch(`/ledger/entries/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteLedgerEntry(id) {
  return apiFetch(`/ledger/entries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function listLedgerCategories({ type } = {}) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : ''
  return apiFetch(`/ledger/categories${qs}`)
}

export async function getLedgerCategory(id) {
  return apiFetch(`/ledger/categories/${encodeURIComponent(id)}`)
}

export async function createExpenseCategory(payload) {
  return apiFetch('/ledger/categories/expense', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function createIncomeCategory(payload) {
  return apiFetch('/ledger/categories/income', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateLedgerCategory(id, payload) {
  return apiFetch(`/ledger/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function restoreLedgerCategory(id) {
  return apiFetch(`/ledger/categories/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  })
}
