import { apiGet, apiPost, apiDelete, apiStream } from './client.js'

export function sendMessage({ message, date } = {}) {
  return apiPost('/api/conversations', { message, date })
}

export function sendMessageStreamed({ message, date }, onDelta, onDone, onError, options) {
  return apiStream('/api/conversations/stream', { message, date }, onDelta, onDone, onError, options)
}

export function getConversation(date) {
  return apiGet(`/api/conversations/${date}`)
}

export function deleteConversation(date) {
  return apiDelete(`/api/conversations/${date}`)
}
