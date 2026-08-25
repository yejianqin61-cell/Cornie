import { apiFetch } from './shared.js'

export async function getModelStatus() {
  return apiFetch('/model/status')
}

export async function getModelSettings() {
  return apiFetch('/settings/model')
}

export async function saveModelSettings(payload) {
  return apiFetch('/settings/model', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function clearModelSettings() {
  return apiFetch('/settings/model', {
    method: 'DELETE',
  })
}
