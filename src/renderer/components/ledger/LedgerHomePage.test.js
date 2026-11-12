import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listEntries: vi.fn(),
  listLedgerCategories: vi.fn(),
  addExpense: vi.fn(),
  addIncome: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  createLedgerCategory: vi.fn(),
  updateLedgerCategory: vi.fn(),
  restoreLedgerCategory: vi.fn(),
}))

vi.mock('../../api/ledger.js', () => api)

import LedgerHomePage from './LedgerHomePage.vue'

const CATEGORIES = [
  { id: 'exp_food', name: '餐饮', type: 'expense', isActive: true, sortOrder: 1 },
  { id: 'exp_old', name: '旧支出', type: 'expense', isActive: false, sortOrder: 2 },
  { id: 'inc_pay', name: '工资', type: 'income', isActive: true, sortOrder: 1 },
]

async function mountPage() {
  const wrapper = mount(LedgerHomePage, {
    global: {
      stubs: {
        PageHeader: { props: ['icon', 'title'], template: '<header><slot name="actions" /></header>' },
        Button: { template: '<button><slot /></button>' },
        LedgerTransactionList: true,
        LedgerTransactionForm: true,
        LedgerMonthSummary: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  api.listEntries.mockResolvedValue({ entries: [] })
  api.listLedgerCategories.mockResolvedValue({ items: CATEGORIES })
  api.createLedgerCategory.mockResolvedValue({ category: { id: 'exp_pet', name: '宠物' } })
  api.updateLedgerCategory.mockResolvedValue({ category: {} })
  api.restoreLedgerCategory.mockResolvedValue({ category: {} })
})

describe('LedgerHomePage categories', () => {
  it('gives the transaction form only active categories and the manager all of them', async () => {
    const wrapper = await mountPage()
    await wrapper.vm.openCategories()
    await wrapper.vm.openAdd()
    await flushPromises()

    const form = wrapper.findComponent({ name: 'LedgerTransactionForm' })
    expect(form.props('categories').map((item) => item.id)).toEqual(['exp_food', 'inc_pay'])
    const manager = wrapper.findComponent({ name: 'CategoryManager' })
    expect(manager.props('categories')).toHaveLength(3)
  })

  it('creates a category of the chosen type and reloads', async () => {
    const wrapper = await mountPage()
    await wrapper.vm.openCategories()
    api.listLedgerCategories.mockClear()

    await wrapper.vm.createCategory({ name: '宠物', type: 'expense' })

    expect(api.createLedgerCategory).toHaveBeenCalledWith('expense', { name: '宠物' })
    expect(api.listLedgerCategories).toHaveBeenCalled()
  })

  it('deactivates and restores categories through the API', async () => {
    const wrapper = await mountPage()
    await wrapper.vm.openCategories()

    await wrapper.vm.deactivateCategory('exp_food')
    expect(api.updateLedgerCategory).toHaveBeenCalledWith('exp_food', { isActive: false })

    await wrapper.vm.restoreCategory('exp_old')
    expect(api.restoreLedgerCategory).toHaveBeenCalledWith('exp_old')
  })

  it('renames a category', async () => {
    const wrapper = await mountPage()
    await wrapper.vm.openCategories()

    await wrapper.vm.renameCategory({ id: 'exp_food', name: '餐厅' })

    expect(api.updateLedgerCategory).toHaveBeenCalledWith('exp_food', { name: '餐厅' })
  })

  it('shows an API error in the manager', async () => {
    api.createLedgerCategory.mockRejectedValue(new Error('名称无效'))
    const wrapper = await mountPage()
    await wrapper.vm.openCategories()

    await wrapper.vm.createCategory({ name: '??', type: 'expense' })
    await flushPromises()

    expect(wrapper.text()).toContain('名称无效')
  })
})
