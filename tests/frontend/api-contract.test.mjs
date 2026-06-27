import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
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
  listScheduleCategories,
  listSchedules,
  listTodoCategories,
  listTodos,
  listTopicIndexItems,
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
} from '../../src/renderer/api.js'

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
