import { apiGet, apiPost } from './client.js'

export function confirmAction(confirmId, decision) {
  return apiPost(`/api/confirmations/${confirmId}/decision`, { decision })
}

export function listConfirmations(date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return apiGet(`/api/confirmations${query}`)
}
