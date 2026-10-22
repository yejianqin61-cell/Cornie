import { apiPost } from './client.js'

export function confirmAction(confirmId, decision) {
  return apiPost(`/api/confirmations/${confirmId}/decision`, { decision })
}
