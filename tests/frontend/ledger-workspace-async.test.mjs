import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import LedgerWorkspace from '../../src/renderer/components/LedgerWorkspace.vue'

function createLedgerFetchMock({ failEntries = false } = {}) {
  const entries = [
    {
      id: 'entry-1',
      type: 'expense',
      amount: 188,
      categoryId: 'cat-lobster',
      categoryName: '海鲜',
      item: '龙虾聚餐',
      merchant: '码头海鲜',
      occurredAt: '2026-06-27T12:30:00.000Z'
    }
  ]
  const categories = [
    { id: 'cat-lobster', type: 'expense', name: '海鲜', sortOrder: 1, isActive: true },
    { id: 'cat-salary', type: 'income', name: '工资', sortOrder: 2, isActive: true }
  ]

  return vi.fn(async (input, init) => {
    const url = String(input)
    const method = init?.method || 'GET'

    if (url.includes('/api/ledger/entries?') || url.endsWith('/api/ledger/entries')) {
      if (failEntries) {
        return {
          ok: false,
          status: 500,
          json: async () => ({}),
          text: async () => '收支记录加载失败'
        }
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ items: entries }),
        text: async () => ''
      }
    }

    if (url.includes('/api/ledger/entries/') && method === 'PUT') {
      const id = url.split('/').pop()
      const payload = JSON.parse(init.body)
      const target = entries.find((item) => item.id === id)
      if (target) {
        target.amount = payload.amount
        target.item = payload.item ?? target.item
        target.merchant = payload.merchant ?? target.merchant
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        text: async () => ''
      }
    }

    if (url.endsWith('/api/ledger/categories')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ items: categories }),
        text: async () => ''
      }
    }

    if (url.endsWith('/api/ledger/entries/expense') && method === 'POST') {
      const payload = JSON.parse(init.body)
      entries.unshift({
        id: 'entry-2',
        type: 'expense',
        amount: payload.amount,
        categoryId: payload.categoryId,
        categoryName: '海鲜',
        item: payload.item,
        merchant: payload.merchant,
        occurredAt: payload.occurredAt
      })

      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        text: async () => ''
      }
    }

    if (url.includes('/api/ledger/entries/') && method === 'DELETE') {
      const id = url.split('/').pop()
      const index = entries.findIndex((item) => item.id === id)
      if (index >= 0) entries.splice(index, 1)

      return {
        ok: true,
        status: 204,
        json: async () => ({}),
        text: async () => ''
      }
    }

    if (url.includes('/api/ledger/categories/') && method === 'PUT') {
      const id = url.split('/').slice(-1)[0]
      const payload = JSON.parse(init.body)
      const category = categories.find((item) => item.id === id)
      if (category && typeof payload.isActive === 'boolean') {
        category.isActive = payload.isActive
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        text: async () => ''
      }
    }

    if (url.includes('/api/ledger/categories/') && url.endsWith('/restore') && method === 'POST') {
      const id = url.split('/').slice(-2)[0]
      const category = categories.find((item) => item.id === id)
      if (category) {
        category.isActive = true
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        text: async () => ''
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => ''
    }
  })
}

describe('LedgerWorkspace async flow', () => {
  beforeEach(() => {
    globalThis.fetch = createLedgerFetchMock()
  })

  it('loads entries and categories, then saves a new ledger entry', async () => {
    const wrapper = mount(LedgerWorkspace)
    await flushPromises()

    expect(wrapper.text()).toContain('龙虾聚餐')
    expect(wrapper.text()).toContain('海鲜')

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('88')
    await inputs[2].setValue('第二顿龙虾')
    await inputs[3].setValue('海边大排档')
    await wrapper.get('.actionRow button').trigger('click')
    await flushPromises()
    await flushPromises()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ledger/entries/expense'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(wrapper.text()).toContain('第二顿龙虾')
  })

  it('shows readable error when loading entries fails', async () => {
    globalThis.fetch = createLedgerFetchMock({ failEntries: true })
    const wrapper = mount(LedgerWorkspace)
    await flushPromises()

    expect(wrapper.text()).toContain('收支记录加载失败')
  })

  it('supports editing, deleting, filtering, and toggling categories', async () => {
    const wrapper = mount(LedgerWorkspace)
    await flushPromises()

    const row = wrapper.find('.entryRow')
    await row.trigger('click')
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('288')
    await inputs[2].setValue('升级版龙虾聚餐')
    await wrapper.find('.actionRow button').trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('升级版龙虾聚餐')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ledger/entries/entry-1'),
      expect.objectContaining({ method: 'PUT' })
    )

    const selects = wrapper.findAll('select')
    await selects[0].setValue('expense')
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('type=expense'),
      expect.any(Object)
    )

    await wrapper.find('.entryRow').trigger('click')
    await flushPromises()
    await wrapper.find('.dangerGhost').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).not.toContain('升级版龙虾聚餐')

    const categoryToggle = wrapper.findAll('.categoryCard button')[0]
    expect(categoryToggle.text()).toBe('停用')
    await categoryToggle.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.findAll('.categoryCard button')[0].text()).toBe('恢复')
  })
})
