import { apiGet, apiPut, apiDelete } from './client.js'

export function getModelSettings() {
  return apiGet('/api/settings/model')
}

export function saveModelSettings(body) {
  return apiPut('/api/settings/model', body)
}

export function getDiaryAutoSetting() {
  return apiGet('/api/settings/diary-auto')
}

export function saveDiaryAutoSetting(enabled) {
  return apiPut('/api/settings/diary-auto', { enabled })
}

export function clearModelSettings() {
  return apiDelete('/api/settings/model')
}
