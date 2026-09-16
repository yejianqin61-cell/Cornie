import { apiPost } from './client.js'

export function confirmAction(confirmId, action) {
  return apiPost(`/api/confirm/${confirmId}`, { action })
}