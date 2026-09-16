import { apiGet } from './client.js'

export function getModelStatus() {
  return apiGet('/api/model/status')
}

export function getHealth() {
  return apiGet('/api/health')
}