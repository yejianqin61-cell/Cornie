import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  apiFetch,
  archiveMemoryWikiPage,
  cancelSchedule,
  clearModelSettings,
  completeTodo,
  createExpenseCategory,
  createExpenseEntry,
  createIncomeCategory,
  createMemoryWikiPage,
  createSchedule,
  createScheduleCategory,
  createTodo,
  createTodoCategory,
  deleteConversation,
  deleteLedgerEntry,
  deleteSchedule,
  deleteTodo,
  enqueueMemoryWikiInspectionScan,
  getChatlog,
  getConfirmation,
  getConversation,
  getEntry,
  getLedgerCategory,
  getLedgerEntry,
  getMemoryWikiGovernanceRequest,
  getMemoryWikiPage,
  getModelStatus,
  getSchedule,
  getScheduleCategory,
  getTodo,
  getTodoCategory,
  getTopicIndexItem,
  linkMemoryWikiRelatedPages,
  linkTopicIndexPage,
  listChatlogDates,
  listConfirmations,
  listEntries,
  listLedgerCategories,
  listLedgerEntries,
  listMemoryWikiGovernanceRequests,
  listMemoryWikiPages,
  listOnThisDay,
  listSchedules,
  listTodos,
  mergeMemoryWikiPages,
  regenerateCornie,
  reorderScheduleCategory,
  reorderTodoCategory,
  reopenTodo,
  restoreLedgerCategory,
  restoreMemoryWikiPage,
  restoreSchedule,
  restoreScheduleCategory,
  restoreTodoCategory,
  rollbackMemoryWikiPage,
  saveModelSettings,
  sendMessage,
  setMemoryWikiImportance,
  setMemoryWikiStatus,
  streamConversation,
  submitConfirmationDecision,
  updateLedgerCategory,
  updateLedgerEntry,
  updateMemoryWikiAliases,
  updateMemoryWikiGovernanceRequestStatus,
  updateMemoryWikiPage,
  updateMemoryWikiSummary,
  updateSchedule,
  updateScheduleCategory,
  updateTodo,
  updateTodoCategory,
  updateTopicIndexAliases,
  upsertEntry
} from '../../src/renderer/api'

function successResponse(status = 200, json = {}) {
  return {
    ok: true,
    status,
    json: async () => json,
    text: async () => ''
  }
}

describe('renderer api contract', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => successResponse())
  })

  it('builds query params for list requests', async () => {
    await listEntries({ month: '2026-06' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/entries?month=2026-06',
      expect.any(Object)
    )

    await listOnThisDay('2026-06-27', { limit: 5 })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/entries/2026-06-27/on-this-day?limit=5',
      expect.any(Object)
    )

    await listChatlogDates({ month: '2026-06' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/chatlogs?month=2026-06',
      expect.any(Object)
    )

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

    await listLedgerCategories({ type: 'expense' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/ledger/categories?type=expense',
      expect.any(Object)
    )

    await listMemoryWikiPages({
      pageType: 'topic',
      status: 'active'
    })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages?pageType=topic&status=active',
      expect.any(Object)
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

  it('builds readonly detail requests correctly', async () => {
    await getEntry('2026-06-27')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/entries/2026-06-27',
      expect.any(Object)
    )

    await getConversation('2026-06-27')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/conversations/2026-06-27',
      expect.any(Object)
    )

    await getChatlog('2026-06-27')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/chatlogs/2026-06-27',
      expect.any(Object)
    )

    await getLedgerEntry('ledger-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/ledger/entries/ledger-1',
      expect.any(Object)
    )

    await getLedgerCategory('ledger-cat-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/ledger/categories/ledger-cat-1',
      expect.any(Object)
    )

    await getTodo('todo-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todos/todo-1',
      expect.any(Object)
    )

    await getTodoCategory('todo-cat-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todo-categories/todo-cat-1',
      expect.any(Object)
    )

    await getSchedule('schedule-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedules/schedule-1',
      expect.any(Object)
    )

    await getScheduleCategory('schedule-cat-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedule-categories/schedule-cat-1',
      expect.any(Object)
    )

    await getMemoryWikiPage('wiki-lobster')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages/wiki-lobster',
      expect.any(Object)
    )

    await getTopicIndexItem('lobster')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/topic-index/lobster',
      expect.any(Object)
    )

    await getMemoryWikiGovernanceRequest('gov-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/governance/gov-1',
      expect.any(Object)
    )

    await getConfirmation('confirm-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/confirmations/confirm-1',
      expect.any(Object)
    )
  })

  it('sends JSON payloads and methods for mutation requests', async () => {
    await upsertEntry('2026-06-27', {
      markdown: '# 今天',
      cornieDiary: '铃湾今天很努力。'
    })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/entries/2026-06-27',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          markdown: '# 今天',
          cornieDiary: '铃湾今天很努力。'
        })
      })
    )

    await regenerateCornie('2026-06-27')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/entries/2026-06-27/regenerate-cornie',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await sendMessage('今天记得龙虾', '2026-06-27')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/conversations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: '今天记得龙虾', date: '2026-06-27' })
      })
    )

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

    await updateLedgerEntry('ledger-1', { amount: 200 })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/ledger/entries/ledger-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ amount: 200 })
      })
    )

    await createExpenseCategory({ name: '海鲜聚餐' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/ledger/categories/expense',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: '海鲜聚餐' })
      })
    )

    await createIncomeCategory({ name: '兼职' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/ledger/categories/income',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: '兼职' })
      })
    )

    await updateLedgerCategory('ledger-cat-1', { name: '餐饮' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/ledger/categories/ledger-cat-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: '餐饮' })
      })
    )

    await restoreLedgerCategory('ledger-cat-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/ledger/categories/ledger-cat-1/restore',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await clearModelSettings()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/settings/model',
      expect.objectContaining({
        method: 'DELETE'
      })
    )

    await createTodo({ title: '买龙虾' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: '买龙虾' })
      })
    )

    await updateTodo('todo-1', { title: '买小龙虾' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todos/todo-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ title: '买小龙虾' })
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

    await deleteTodo('todo-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todos/todo-1',
      expect.objectContaining({
        method: 'DELETE'
      })
    )

    await createTodoCategory({ name: '采购' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todo-categories',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: '采购' })
      })
    )

    await updateTodoCategory('todo-cat-1', { name: '生活采购' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todo-categories/todo-cat-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: '生活采购' })
      })
    )

    await restoreTodoCategory('todo-cat-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todo-categories/todo-cat-1/restore',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await reorderTodoCategory('todo-cat-1', 2)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/todo-categories/todo-cat-1/reorder',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sortOrder: 2 })
      })
    )

    await createSchedule({ title: '龙虾聚餐' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedules',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: '龙虾聚餐' })
      })
    )

    await updateSchedule('schedule-1', { title: '澳龙聚餐' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedules/schedule-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ title: '澳龙聚餐' })
      })
    )

    await cancelSchedule('schedule-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedules/schedule-1/cancel',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await restoreSchedule('schedule-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedules/schedule-1/restore',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await deleteSchedule('schedule-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedules/schedule-1',
      expect.objectContaining({
        method: 'DELETE'
      })
    )

    await createScheduleCategory({ name: '聚餐' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedule-categories',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: '聚餐' })
      })
    )

    await updateScheduleCategory('schedule-cat-1', { name: '朋友聚餐' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedule-categories/schedule-cat-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: '朋友聚餐' })
      })
    )

    await restoreScheduleCategory('schedule-cat-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedule-categories/schedule-cat-1/restore',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await reorderScheduleCategory('schedule-cat-1', 3)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/schedule-categories/schedule-cat-1/reorder',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sortOrder: 3 })
      })
    )

    await createMemoryWikiPage({
      pageType: 'topic',
      title: '龙虾',
      summary: '重要偏好'
    })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          pageType: 'topic',
          title: '龙虾',
          summary: '重要偏好'
        })
      })
    )

    await updateMemoryWikiPage('wiki-lobster', { title: '澳龙' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages/wiki-lobster',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ title: '澳龙' })
      })
    )

    await updateMemoryWikiSummary('wiki-lobster', '喜欢澳龙')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages/wiki-lobster/summary',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ summary: '喜欢澳龙' })
      })
    )

    await updateMemoryWikiAliases('wiki-lobster', ['龙虾', '澳龙'])
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages/wiki-lobster/aliases',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ aliases: ['龙虾', '澳龙'] })
      })
    )

    await setMemoryWikiStatus('wiki-lobster', 'inactive')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages/wiki-lobster/status',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ status: 'inactive' })
      })
    )

    await setMemoryWikiImportance('wiki-lobster', 'critical')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages/wiki-lobster/importance',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ importance: 'critical' })
      })
    )

    await archiveMemoryWikiPage('wiki-lobster')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages/wiki-lobster/archive',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await restoreMemoryWikiPage('wiki-lobster')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages/wiki-lobster/restore',
      expect.objectContaining({
        method: 'POST'
      })
    )

    await rollbackMemoryWikiPage('wiki-lobster', 'version-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages/wiki-lobster/rollback',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ versionId: 'version-1' })
      })
    )

    await mergeMemoryWikiPages({
      targetPageId: 'wiki-lobster',
      sourcePageIds: ['wiki-lobster-2']
    })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages/merge',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          targetPageId: 'wiki-lobster',
          sourcePageIds: ['wiki-lobster-2']
        })
      })
    )

    await linkMemoryWikiRelatedPages('wiki-lobster', ['wiki-lobster-2'])
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/pages/wiki-lobster/related-pages',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ relatedPageIds: ['wiki-lobster-2'] })
      })
    )

    await updateTopicIndexAliases('lobster', ['澳龙'])
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/api/memory-wiki/topic-index/lobster/aliases',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ aliases: ['澳龙'] })
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

  it('supports 204 responses for delete-style endpoints', async () => {
    globalThis.fetch = vi.fn(async () => successResponse(204))

    await expect(deleteConversation('2026-06-27')).resolves.toBeNull()
    await expect(deleteLedgerEntry('ledger-1')).resolves.toBeNull()
  })

  it('throws readable errors when backend replies with failure text', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
      text: async () => 'deepseek upstream timeout'
    }))

    await expect(getModelStatus()).rejects.toThrow('deepseek upstream timeout')
  })

  it('falls back to http status when backend error text is empty', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({}),
      text: async () => ''
    }))

    await expect(getModelStatus()).rejects.toThrow('HTTP 502')
  })
})

describe('renderer request layer hardening', () => {
  const enc = (s) => new TextEncoder().encode(s)

  /** SSE 响应 mock：按块依次吐字节。 */
  function streamResponse(chunks) {
    let i = 0
    return {
      ok: true,
      status: 200,
      text: async () => '',
      body: {
        getReader: () => ({
          read: async () => {
            if (i >= chunks.length) return { done: true, value: undefined }
            const value = chunks[i]
            i += 1
            return { done: false, value }
          }
        })
      }
    }
  }

  it('rejects with kind timeout when a request exceeds the default 30s timeout', async () => {
    vi.useFakeTimers()
    try {
      globalThis.fetch = vi.fn(() => new Promise(() => {})) // 永不 resolve
      const pending = listEntries({ month: '2026-06' })
      // fake timers 推进时拒绝先于断言发生，先挂占位 handler 避免 Node 未处理拒绝告警
      pending.catch(() => {})
      await vi.advanceTimersByTimeAsync(30_000)
      await expect(pending).rejects.toMatchObject({
        name: 'ApiError',
        kind: 'timeout',
        message: expect.stringContaining('timed out after 30000ms')
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('honors a custom timeoutMs override', async () => {
    vi.useFakeTimers()
    try {
      globalThis.fetch = vi.fn(() => new Promise(() => {}))
      const pending = apiFetch('/entries', { timeoutMs: 5_000 })
      pending.catch(() => {})
      await vi.advanceTimersByTimeAsync(4_999)
      // 未到超时点：仍 pending
      await expect(Promise.race([pending.then(() => 'resolved'), Promise.resolve('pending')])).resolves.toBe('pending')
      await vi.advanceTimersByTimeAsync(1)
      await expect(pending).rejects.toMatchObject({ name: 'ApiError', kind: 'timeout' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('aborts the in-flight request when an external signal fires', async () => {
    const controller = new AbortController()
    globalThis.fetch = vi.fn(() => new Promise(() => {}))
    const pending = apiFetch('/entries?month=2026-06', { signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('rejects immediately when the external signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    globalThis.fetch = vi.fn(() => new Promise(() => {}))
    await expect(apiFetch('/entries', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError'
    })
  })

  it('classifies http 400 with a JSON error body', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({}),
      text: async () => JSON.stringify({ error: 'invalid date format' })
    }))

    await expect(getEntry('2026-06-27')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'http',
      status: 400,
      message: 'invalid date format'
    })
  })

  it('classifies http 500 with a plain text body', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => 'Internal Server Error'
    }))

    await expect(regenerateCornie('2026-06-27')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'http',
      status: 500,
      message: 'Internal Server Error'
    })
  })

  it('falls back to response text when the JSON error field is not a string', async () => {
    const body = JSON.stringify({ error: { code: 1 } })
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 422,
      json: async () => ({}),
      text: async () => body
    }))

    await expect(sendMessage('hi', '2026-06-27')).rejects.toMatchObject({
      kind: 'http',
      status: 422,
      message: body
    })
  })

  it('classifies a network rejection (fetch TypeError) as network', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })

    await expect(listEntries()).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'network'
    })
  })

  it('keeps ApiError readable through name/message like a plain Error', async () => {
    const err = new ApiError('http', 'boom', { status: 503 })
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ApiError')
    expect(err.kind).toBe('http')
    expect(err.status).toBe(503)
    expect(err.message).toBe('boom')
    expect(`${err}`).toContain('boom')
  })

  describe('streamConversation hardening', () => {
    it('streams delta events and resolves with the done result', async () => {
      globalThis.fetch = vi.fn(async () => streamResponse([
        enc('data: {"kind":"delta","text":"你"}\n'),
        enc('data: {"kind":"delta","text":"好"}\ndata: {"kind":"done","result":{"cornieMessage":{"id":"m1","content":"你好"}}}\n')
      ]))

      const deltas = []
      const result = await streamConversation(
        { message: 'hi', date: '2026-06-27' },
        (d) => deltas.push(d)
      )
      expect(deltas).toEqual(['你', '好'])
      expect(result).toEqual({ cornieMessage: { id: 'm1', content: '你好' } })
    })

    it('throws a protocol error when the stream emits a kind:error event', async () => {
      globalThis.fetch = vi.fn(async () => streamResponse([
        enc('data: {"kind":"error","error":"upstream exploded"}\n')
      ]))

      await expect(
        streamConversation({ message: 'hi', date: '2026-06-27' }, () => {})
      ).rejects.toMatchObject({ name: 'ApiError', kind: 'protocol', message: 'upstream exploded' })
    })

    it('throws a protocol error when the stream ends before a done event', async () => {
      globalThis.fetch = vi.fn(async () => streamResponse([
        enc('data: {"kind":"delta","text":"hi"}\n')
      ]))

      const deltas = []
      await expect(
        streamConversation({ message: 'hi', date: '2026-06-27' }, (d) => deltas.push(d))
      ).rejects.toMatchObject({ kind: 'protocol', message: 'stream ended prematurely' })
      expect(deltas).toEqual(['hi'])
    })

    it('skips malformed data lines without failing the stream', async () => {
      globalThis.fetch = vi.fn(async () => streamResponse([
        enc('data: not-json\n'),
        enc('data: {"kind":"delta","text":"ok"}\ndata: {"kind":"done","result":{"ok":true}}\n')
      ]))

      const deltas = []
      const result = await streamConversation(
        { message: 'hi', date: '2026-06-27' },
        (d) => deltas.push(d)
      )
      expect(deltas).toEqual(['ok'])
      expect(result).toEqual({ ok: true })
    })

    it('parses a final data line that has no trailing newline', async () => {
      globalThis.fetch = vi.fn(async () => streamResponse([
        enc('data: {"kind":"delta","text":"a"}\n'),
        enc('data: {"kind":"done","result":{"ok":true}}') // 无结尾换行
      ]))

      const deltas = []
      const result = await streamConversation(
        { message: 'hi', date: '2026-06-27' },
        (d) => deltas.push(d)
      )
      expect(deltas).toEqual(['a'])
      expect(result).toEqual({ ok: true })
    })

    it('stops reading and no longer calls onDelta after external abort', async () => {
      const controller = new AbortController()
      globalThis.fetch = vi.fn((url, init) => Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '',
        body: {
          getReader: () => ({
            read: () => new Promise((resolve, reject) => {
              init.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'))
              })
            })
          })
        }
      }))

      const deltas = []
      const pending = streamConversation(
        { message: 'hi', date: '2026-06-27' },
        (d) => deltas.push(d),
        { signal: controller.signal }
      )
      controller.abort()
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
      expect(deltas).toEqual([])
    })

    it('rejects with kind timeout when streaming exceeds the timeout', async () => {
      vi.useFakeTimers()
      try {
        globalThis.fetch = vi.fn(() => new Promise(() => {}))
        const pending = streamConversation(
          { message: 'hi', date: '2026-06-27' },
          () => {},
          { timeoutMs: 5_000 }
        )
        pending.catch(() => {})
        await vi.advanceTimersByTimeAsync(5_000)
        await expect(pending).rejects.toMatchObject({ name: 'ApiError', kind: 'timeout' })
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
