import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LedgerTransactionForm from './LedgerTransactionForm.vue'
import LedgerCategoryTag from './LedgerCategoryTag.vue'
import LedgerMonthSummary from './LedgerMonthSummary.vue'
import LedgerEmptyState from './LedgerEmptyState.vue'

const categories = [
  { name: '餐饮', color: '#ff6b6b', type: 'expense' },
  { name: '工资', color: '#00b894', type: 'income' },
]

describe('LedgerTransactionForm', () => {
  it('renders add mode by default', () => {
    const wrapper = mount(LedgerTransactionForm, {
      props: { categories },
    })
    expect(wrapper.text()).toContain('记一笔')
  })

  it('renders edit mode with initialData', () => {
    const wrapper = mount(LedgerTransactionForm, {
      props: {
        categories,
        initialData: { type: 'expense', category: '餐饮', amount: 45, date: '2026-09-16', note: '午餐' },
      },
    })
    expect(wrapper.text()).toContain('编辑')
  })

  it('shows saving state', () => {
    const wrapper = mount(LedgerTransactionForm, {
      props: { categories, saving: true },
    })
    expect(wrapper.text()).toContain('保存中')
  })

  it('shows saveError when provided', () => {
    const wrapper = mount(LedgerTransactionForm, {
      props: { categories, saveError: '保存失败' },
    })
    expect(wrapper.text()).toContain('保存失败')
  })

  it('emits save with form data', async () => {
    const wrapper = mount(LedgerTransactionForm, {
      props: { categories },
    })
    const inputs = wrapper.findAll('.tx-form-input')
    await inputs[0].setValue('100')
    const catBtns = wrapper.findAll('.tx-form-cat-btn')
    await catBtns[0].trigger('click')
    const saveBtn = wrapper.findAllComponents({ name: 'Button' }).find(b => b.text() === '保存')
    await saveBtn.trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0][0].amount).toBe(100)
  })
})

describe('LedgerCategoryTag', () => {
  it('renders category name', () => {
    const wrapper = mount(LedgerCategoryTag, {
      props: { category: '餐饮', color: '#ff6b6b' },
    })
    expect(wrapper.text()).toContain('餐饮')
  })
})

describe('LedgerMonthSummary', () => {
  it('renders income and expense', () => {
    const wrapper = mount(LedgerMonthSummary, {
      props: { month: '2026-09', income: 5000, expense: 1200 },
    })
    expect(wrapper.text()).toContain('2026-09')
  })
})

describe('LedgerEmptyState', () => {
  it('renders empty message', () => {
    const wrapper = mount(LedgerEmptyState)
    expect(wrapper.text()).toContain('收支记录')
  })
})