import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cancelSchedule,
  clearModelSettings,
  completeTodo,
  createExpenseEntry,
  enqueueMemoryWikiInspectionScan,
  getConfirmation,
  getModelStatus,
  getSchedule,
  linkTopicIndexPage,
  listConfirmations,
  listLedgerEntries,
  listMemoryWikiGovernanceRequests,
  listSchedules,
  listTodos,
  reopenTodo,
  saveModelSettings,
  submitConfirmationDecision,
  updateMemoryWikiGovernanceRequestStatus
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

    await listTodos({
      view: 'open',
      from: '2026-06-01',
      to: '2026-06-30'
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todos?view=open&from=2026-06-01&to=2026-06-30',
      expect.any(Object)
    )

    await listSchedules({
      view: 'upcoming',
      from: '2026-06-01',
      to: '2026-06-30'
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedules?view=upcoming&from=2026-06-01&to=2026-06-30',
      expect.any(Object)
    )

    await listConfirmations({
      date: '2026-06-27',
      status: 'pending'
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/confirmations?date=2026-06-27&status=pending',
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

    await completeTodo('todo-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todos/todo-1/complete',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await reopenTodo('todo-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todos/todo-1/reopen',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await cancelSchedule('schedule-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedules/schedule-1/cancel',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await submitConfirmationDecision('confirm-1', 'approve')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/confirmations/confirm-1/decision',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ decision: 'approve' })
      })
    )

    await updateMemoryWikiGovernanceRequestStatus('gov-1', 'approved')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/governance/gov-1/status',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ status: 'approved' })
      })
    )

    await enqueueMemoryWikiInspectionScan()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/governance/inspection-scan',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await linkTopicIndexPage('lobster', 'wiki-lobster')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/topic-index/lobster/link-page',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ pageId: 'wiki-lobster' })
      })
    )
  })

  it('builds readonly detail requests correctly', async () => {
    await getConfirmation('confirm-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/confirmations/confirm-1',
      expect.any(Object)
    )

    await getSchedule('schedule-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedules/schedule-1',
      expect.any(Object)
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
