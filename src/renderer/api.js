const API_BASE = 'http://127.0.0.1:5174/api'

async function apiFetch(path, init) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.status === 204 ? null : res.json()
}

export async function listEntries({ month } = {}) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiFetch(`/entries${qs}`)
}

export async function getEntry(date) {
  return apiFetch(`/entries/${encodeURIComponent(date)}`)
}

export async function upsertEntry(date, payload) {
  return apiFetch(`/entries/${encodeURIComponent(date)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function regenerateCornie(date) {
  return apiFetch(`/entries/${encodeURIComponent(date)}/regenerate-cornie`, {
    method: 'POST'
  })
}

export async function listOnThisDay(date, { limit } = {}) {
  const qs = limit ? `?limit=${encodeURIComponent(String(limit))}` : ''
  return apiFetch(`/entries/${encodeURIComponent(date)}/on-this-day${qs}`)
}

// ─── conversations ────────────────────────────────────────────

export async function sendMessage(message, date) {
  return apiFetch('/conversations', {
    method: 'POST',
    body: JSON.stringify({ message, date })
  })
}

export async function getConversation(date) {
  return apiFetch(`/conversations/${encodeURIComponent(date)}`)
}

export async function deleteConversation(date) {
  return apiFetch(`/conversations/${encodeURIComponent(date)}`, { method: 'DELETE' })
}

export async function listChatlogDates({ month } = {}) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiFetch(`/chatlogs${qs}`)
}

export async function getChatlog(date) {
  return apiFetch(`/chatlogs/${encodeURIComponent(date)}`)
}

// ─── model ───────────────────────────────────────────────────

export async function getModelStatus() {
  return apiFetch('/model/status')
}

export async function submitConfirmationDecision(id, decision) {
  return apiFetch(`/confirmations/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision })
  })
}

export async function getConfirmation(id) {
  return apiFetch(`/confirmations/${encodeURIComponent(id)}`)
}

export async function listConfirmations({ date, status } = {}) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (status) params.set('status', status)
  const qs = params.toString()
  return apiFetch(`/confirmations${qs ? `?${qs}` : ''}`)
}

// ─── ledger ──────────────────────────────────────────────────

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
    body: JSON.stringify(payload)
  })
}

export async function createIncomeEntry(payload) {
  return apiFetch('/ledger/entries/income', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateLedgerEntry(id, payload) {
  return apiFetch(`/ledger/entries/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteLedgerEntry(id) {
  return apiFetch(`/ledger/entries/${encodeURIComponent(id)}`, {
    method: 'DELETE'
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
    body: JSON.stringify(payload)
  })
}

export async function createIncomeCategory(payload) {
  return apiFetch('/ledger/categories/income', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateLedgerCategory(id, payload) {
  return apiFetch(`/ledger/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function restoreLedgerCategory(id) {
  return apiFetch(`/ledger/categories/${encodeURIComponent(id)}/restore`, {
    method: 'POST'
  })
}

