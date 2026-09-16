import { apiGet, apiDelete } from './client.js'

export function listChatDays() {
  return apiGet('/api/chatlog/days')
}

export function getChatDay(date) {
  return apiGet(`/api/chatlog/days/${date}`)
}

export function deleteChatDay(date) {
  return apiDelete(`/api/chatlog/days/${date}`)
}