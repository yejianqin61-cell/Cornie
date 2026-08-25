import { apiFetch } from './shared.js'

export async function submitConfirmationDecision(id, decision) {
  return apiFetch(`/confirmations/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
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
