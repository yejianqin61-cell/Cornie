import { beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TodoList from './TodoList.vue'
import TodoEmptyState from './TodoEmptyState.vue'
import TodoForm from './TodoForm.vue'
import TodoHomePage from './TodoHomePage.vue'
import { completeTodo, listTodos } from '../../api/todo.js'

vi.mock('../../api/todo.js', () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  completeTodo: vi.fn(),
  reopenTodo: vi.fn(),
  deleteTodo: vi.fn(),
  updateTodo: vi.fn(),
}))

describe('TodoList', () => {
  const items = [
    { id: '1', title: '买菜', status: 'pending' },
    { id: '2', title: '跑步', status: 'done' },
  ]

  it('renders items', () => {
    const wrapper = mount(TodoList, { props: { items } })
    expect(wrapper.text()).toContain('买菜')
    expect(wrapper.text()).toContain('跑步')
  })

  it('emits complete for open item', async () => {
    const wrapper = mount(TodoList, { props: { items } })
    const buttons = wrapper.findAllComponents({ name: 'Button' })
    const checkBtn = buttons.find((b) => b.props('size') === 'icon')
    if (checkBtn) {
      await checkBtn.trigger('click')
      expect(wrapper.emitted('complete')).toBeTruthy()
    }
  })

  it('emits reopen for a done item from the service status', async () => {
    const wrapper = mount(TodoList, {
      props: { items: [{ id: '2', title: '跑步', status: 'done' }] },
    })
    const buttons = wrapper.findAllComponents({ name: 'Button' })

    await buttons[0].trigger('click')
    expect(wrapper.emitted('reopen')).toEqual([['2']])
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

  it('shows submitting state', () => {
    const wrapper = mount(TodoForm, { props: { submitting: true } })
    expect(wrapper.text()).toContain('添加中')
  })
})

describe('TodoHomePage write failures', () => {
  beforeEach(() => {
    listTodos.mockResolvedValue({ items: [{ id: '1', title: '买菜', status: 'pending' }] })
    completeTodo.mockReset()
  })

  it('keeps the item and offers a retry when completion fails', async () => {
    completeTodo.mockRejectedValueOnce(new Error('完成失败'))
    const wrapper = mount(TodoHomePage)
    await flushPromises()

    await wrapper.findComponent(TodoList).vm.$emit('complete', '1')
    await flushPromises()

    expect(wrapper.text()).toContain('完成失败')
    expect(wrapper.text()).toContain('重试')
    expect(wrapper.text()).toContain('买菜')
  })
})
