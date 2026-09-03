import { apiFetch } from './shared'

export type ConfirmationDecision = 'approved' | 'rejected' | string

export async function submitConfirmationDecision(id: string, decision: ConfirmationDecision): Promise<unknown> {
  return apiFetch(`/confirmations/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  })
}

export async function getConfirmation(id: string): Promise<unknown> {
  return apiFetch(`/confirmations/${encodeURIComponent(id)}`)
}

export async function listConfirmations({ date, status }: { date?: string; status?: string } = {}): Promise<unknown> {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (status) params.set('status', status)
  const qs = params.toString()
  return apiFetch(`/confirmations${qs ? `?${qs}` : ''}`)
}
