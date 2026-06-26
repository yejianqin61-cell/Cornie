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

