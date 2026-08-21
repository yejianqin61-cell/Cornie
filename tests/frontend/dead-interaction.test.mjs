import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/renderer/api', () => ({
  completeTodo: vi.fn(),
  createTodo: vi.fn(),
  deleteTodo: vi.fn(),
  listTodoCategories: vi.fn(),
  listTodos: vi.fn(),
  reopenTodo: vi.fn(),
  cancelSchedule: vi.fn(),
  createSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  listScheduleCategories: vi.fn(),
  listSchedules: vi.fn(),
  restoreSchedule: vi.fn(),
  createExpenseCategory: vi.fn(),
  createExpenseEntry: vi.fn(),
  createIncomeCategory: vi.fn(),
  createIncomeEntry: vi.fn(),
  listLedgerEntries: vi.fn(),
  listLedgerCategories: vi.fn()
}))

import * as api from '../../src/renderer/api'
import LedgerHome from '../../src/renderer/components/LedgerHome.vue'
import ScheduleHome from '../../src/renderer/components/ScheduleHome.vue'
import TodoHome from '../../src/renderer/components/TodoHome.vue'

beforeEach(() => {
  vi.clearAllMocks()
  api.listTodos.mockResolvedValue({ todos: [] })
  api.listTodoCategories.mockResolvedValue({ categories: [] })
  api.listSchedules.mockResolvedValue({ schedules: [] })
  api.listScheduleCategories.mockResolvedValue({ categories: [] })
  api.listLedgerEntries.mockResolvedValue({ entries: [] })
  api.listLedgerCategories.mockResolvedValue({ categories: [] })
})

describe('FE-07 死交互治理', () => {
  it('TodoHome 不再渲染无目标的"管理类目"按钮', async () => {
    const wrapper = mount(TodoHome)
    await flushPromises()
    expect(wrapper.text()).not.toContain('管理类目')
    wrapper.unmount()
  })

  it('ScheduleHome 不再渲染无目标的"管理类目"按钮', async () => {
    const wrapper = mount(ScheduleHome)
    await flushPromises()
    expect(wrapper.text()).not.toContain('管理类目')
    wrapper.unmount()
  })

  it('LedgerHome"查看全部"展开完整记录并可收起', async () => {
    api.listLedgerEntries.mockResolvedValue({
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `e${i}`,
        type: 'expense',
        amount: i + 1,
        occurredAt: '2026-08-21',
        item: `条目${i}`,
        categoryName: ''
      }))
    })
    const wrapper = mount(LedgerHome)
    await flushPromises()

    // 默认只显示前 8 条
    expect(wrapper.text()).toContain('条目0')
    expect(wrapper.text()).not.toContain('条目9')

    const toggle = wrapper.findAll('button').find((b) => b.text() === '查看全部')
    expect(toggle).toBeDefined()
    await toggle.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('条目9')
    expect(wrapper.findAll('button').find((b) => b.text() === '收起')).toBeDefined()
    wrapper.unmount()
  })

  it('LedgerHome"管理收支类目"打开新增表单并暴露类目新建入口', async () => {
    const wrapper = mount(LedgerHome)
    await flushPromises()

    expect(wrapper.text()).not.toContain('新建类目')

    const manage = wrapper.findAll('button').find((b) => b.text().includes('管理收支类目'))
    expect(manage).toBeDefined()
    await manage.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('新建类目')
    wrapper.unmount()
  })
})
