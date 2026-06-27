import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearModelSettings,
  createExpenseEntry,
  getModelStatus,
  listLedgerEntries,
  listMemoryWikiGovernanceRequests,
  saveModelSettings
} from '../../src/renderer/api.js'

describe('renderer api contract', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => ''
    }))
  })

  it('builds query params for list requests', async () => {
    await listLedgerEntries({
      from: '2026-06-01',
      to: '2026-06-30',
      type: 'expense',
      categoryId: 'cat-lobster',
      recent: 30,
      ids: ['a1', 'a2']
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/ledger/entries?from=2026-06-01&to=2026-06-30&type=expense&categoryId=cat-lobster&recent=30&ids=a1%2Ca2',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    )

    await listMemoryWikiGovernanceRequests({
      status: 'pending',
      requestType: 'merge_candidate',
      triggerSource: 'inspection',
      queueSection: 'merge'
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/governance?status=pending&requestType=merge_candidate&triggerSource=inspection&queueSection=merge',
      expect.any(Object)
    )
  })

  it('sends JSON payloads and methods for mutation requests', async () => {
    await saveModelSettings({
      apiKey: 'sk-demo-key',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      timeoutMs: '45000'
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/settings/model',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          apiKey: 'sk-demo-key',
          baseUrl: 'https://api.deepseek.com',
          model: 'deepseek-chat',
          timeoutMs: '45000'
        })
      })
    )

    await createExpenseEntry({
      amount: 188,
      categoryId: 'cat-lobster',
      item: '龙虾聚餐'
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/ledger/entries/expense',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          amount: 188,
          categoryId: 'cat-lobster',
          item: '龙虾聚餐'
        })
      })
    )

    await clearModelSettings()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/settings/model',
      expect.objectContaining({
        method: 'DELETE'
      })
    )
  })

  it('throws readable errors when backend replies with failure', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
      text: async () => 'deepseek upstream timeout'
    }))

    await expect(getModelStatus()).rejects.toThrow('deepseek upstream timeout')
  })
})
