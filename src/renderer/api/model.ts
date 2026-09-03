import { apiFetch } from './shared'

export interface ModelStatus {
  ok?: boolean
  configured?: boolean
  [key: string]: unknown
}

export interface ModelSettings {
  apiKey?: string
  baseUrl?: string
  model?: string
  timeoutMs?: number | string
  [key: string]: unknown
}

export async function getModelStatus(): Promise<ModelStatus> {
  return apiFetch<ModelStatus>('/model/status')
}

export async function getModelSettings(): Promise<ModelSettings> {
  return apiFetch<ModelSettings>('/settings/model')
}

export async function saveModelSettings(payload: Partial<ModelSettings>): Promise<unknown> {
  return apiFetch('/settings/model', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function clearModelSettings(): Promise<unknown> {
  return apiFetch('/settings/model', {
    method: 'DELETE',
  })
}
