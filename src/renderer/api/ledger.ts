import { apiFetch } from './shared'

export type LedgerEntryType = 'expense' | 'income' | string

export interface LedgerEntryPayload {
  date?: string
  amount?: number
  occurredAt?: string
  categoryId?: string | null
  categoryName?: string | null
  item?: string | null
  note?: string | null
  [key: string]: unknown
}

export interface LedgerCategoryPayload {
  name?: string
  type?: LedgerEntryType
  sortOrder?: number
  [key: string]: unknown
}

export async function listLedgerEntries({
  from,
  to,
  type,
  categoryId,
  categoryName,
  recent,
  ids,
}: {
  from?: string
  to?: string
  type?: string
  categoryId?: string
  categoryName?: string
  recent?: boolean
  ids?: string[]
} = {}): Promise<unknown> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (type) params.set('type', type)
  if (categoryId) params.set('categoryId', categoryId)
  if (categoryName) params.set('categoryName', categoryName)
  if (recent !== undefined) params.set('recent', String(recent))
  if (Array.isArray(ids) && ids.length > 0) params.set('ids', ids.join(','))
  const qs = params.toString()
  return apiFetch(`/ledger/entries${qs ? `?${qs}` : ''}`)
}

export async function getLedgerEntry(id: string): Promise<unknown> {
  return apiFetch(`/ledger/entries/${encodeURIComponent(id)}`)
}

export async function createExpenseEntry(payload: LedgerEntryPayload): Promise<unknown> {
  return apiFetch('/ledger/entries/expense', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function createIncomeEntry(payload: LedgerEntryPayload): Promise<unknown> {
  return apiFetch('/ledger/entries/income', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateLedgerEntry(id: string, payload: LedgerEntryPayload): Promise<unknown> {
  return apiFetch(`/ledger/entries/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteLedgerEntry(id: string): Promise<unknown> {
  return apiFetch(`/ledger/entries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function listLedgerCategories({ type }: { type?: string } = {}): Promise<unknown> {
  const qs = type ? `?type=${encodeURIComponent(type)}` : ''
  return apiFetch(`/ledger/categories${qs}`)
}

export async function getLedgerCategory(id: string): Promise<unknown> {
  return apiFetch(`/ledger/categories/${encodeURIComponent(id)}`)
}

export async function createExpenseCategory(payload: LedgerCategoryPayload): Promise<unknown> {
  return apiFetch('/ledger/categories/expense', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function createIncomeCategory(payload: LedgerCategoryPayload): Promise<unknown> {
  return apiFetch('/ledger/categories/income', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateLedgerCategory(id: string, payload: LedgerCategoryPayload): Promise<unknown> {
  return apiFetch(`/ledger/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function restoreLedgerCategory(id: string): Promise<unknown> {
  return apiFetch(`/ledger/categories/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  })
}
