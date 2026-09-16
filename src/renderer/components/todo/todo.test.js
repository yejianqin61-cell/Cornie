import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TodoList from './TodoList.vue'
import TodoEmptyState from './TodoEmptyState.vue'
import TodoForm from './TodoForm.vue'

describe('TodoList', () => {
  const items = [{ id: '1', title: '买菜' }, { id: '2', title: '跑步', completedAt: '2026-09-16' }]

  it('renders items', () => {
    const wrapper = mount(TodoList, { props: { items } })
    expect(wrapper.text()).toContain('买菜')
    expect(wrapper.text()).toContain('跑步')
  })

  it('emits complete for open item', async () => {
    const wrapper = mount(TodoList, { props: { items } })
    const buttons = wrapper.findAllComponents({ name: 'Button' })
    const checkBtn = buttons.find(b => b.props('size') === 'icon')
    if (checkBtn) {
      await checkBtn.trigger('click')
      expect(wrapper.emitted('complete')).toBeTruthy()
    }
  })

  it('emits delete', async () => {
    const wrapper = mount(TodoList, { props: { items } })
    const buttons = wrapper.findAllComponents({ name: 'Button' })
    const lastBtn = buttons[buttons.length - 1]
    await lastBtn.trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })
})

describe('TodoEmptyState', () => {
  it('renders empty message', () => {
    const wrapper = mount(TodoEmptyState)
    expect(wrapper.text()).toContain('暂无待办事项')
  })
})

describe('TodoForm', () => {
  it('emits create on submit', async () => {
    const wrapper = mount(TodoForm)
    await wrapper.findComponent({ name: 'Input' }).setValue('新待办')
    await wrapper.findComponent({ name: 'Button' }).trigger('click')
    expect(wrapper.emitted('create')).toBeTruthy()
    expect(wrapper.emitted('create')[0][0]).toBe('新待办')
  })
})