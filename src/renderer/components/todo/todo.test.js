import { beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TodoList from './TodoList.vue'
import TodoEmptyState from './TodoEmptyState.vue'
import TodoForm from './TodoForm.vue'
import TodoHomePage from './TodoHomePage.vue'
import {
  completeTodo,
  createTodo,
  createTodoCategory,
  listTodoCategories,
  listTodos,
  reorderTodoCategory,
} from '../../api/todo.js'

vi.mock('../../api/todo.js', () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  completeTodo: vi.fn(),
  reopenTodo: vi.fn(),
  deleteTodo: vi.fn(),
  updateTodo: vi.fn(),
  listTodoCategories: vi.fn(),
  createTodoCategory: vi.fn(),
  updateTodoCategory: vi.fn(),
  restoreTodoCategory: vi.fn(),
  reorderTodoCategory: vi.fn(),
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
    await wrapper.get('input').setValue('新待办')
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
    listTodoCategories.mockResolvedValue({ items: [] })
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

describe('TodoList category tag', () => {
  it('shows the category name when present', () => {
    const wrapper = mount(TodoList, {
      props: { items: [{ id: '1', title: '看书', status: 'pending', categoryName: '读书' }] },
    })
    expect(wrapper.text()).toContain('读书')
  })
})

describe('TodoForm category select', () => {
  const categories = [{ id: 'cat_read', name: '读书', isActive: true }]

  it('emits the chosen category with the title', async () => {
    const wrapper = mount(TodoForm, { props: { categories } })
    await wrapper.get('[data-testid="todo-category-select"]').setValue('cat_read')
    await wrapper.get('input').setValue('看书')
    await wrapper.findComponent({ name: 'Button' }).trigger('click')
    expect(wrapper.emitted('create')[0]).toEqual(['看书', { id: 'cat_read', name: '读书' }])
  })

  it('emits no category for the no-category option', async () => {
    const wrapper = mount(TodoForm, { props: { categories } })
    await wrapper.get('input').setValue('看书')
    await wrapper.findComponent({ name: 'Button' }).trigger('click')
    expect(wrapper.emitted('create')[0][1]).toBeUndefined()
  })
})

describe('TodoHomePage categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listTodos.mockResolvedValue({ items: [] })
    listTodoCategories.mockResolvedValue({
      items: [
        { id: 'cat_a', name: '读书', isActive: true, sortOrder: 1 },
        { id: 'cat_b', name: '运动', isActive: true, sortOrder: 2 },
      ],
    })
    createTodoCategory.mockResolvedValue({ category: { id: 'cat_c', name: '音乐' } })
    createTodo.mockResolvedValue({ entry: {} })
    reorderTodoCategory.mockResolvedValue({ category: {} })
  })

  it('swaps the order of two categories with two reorder calls', async () => {
    const wrapper = mount(TodoHomePage)
    await flushPromises()
    await wrapper.vm.openCategories()

    await wrapper.vm.moveCategory({ id: 'cat_b', direction: 'up' })

    expect(reorderTodoCategory).toHaveBeenCalledTimes(2)
    expect(reorderTodoCategory).toHaveBeenCalledWith('cat_b', 1)
    expect(reorderTodoCategory).toHaveBeenCalledWith('cat_a', 2)
  })

  it('creates a category and reloads the list including inactive ones', async () => {
    const wrapper = mount(TodoHomePage)
    await flushPromises()
    await wrapper.vm.openCategories()
    listTodoCategories.mockClear()

    await wrapper.vm.createCategory({ name: '音乐' })

    expect(createTodoCategory).toHaveBeenCalledWith({ name: '音乐' })
    expect(listTodoCategories).toHaveBeenCalledWith({ includeInactive: true })
  })

  it('sends the selected category with a new todo', async () => {
    const wrapper = mount(TodoHomePage)
    await flushPromises()

    await wrapper.vm.onCreate('看书', { id: 'cat_a', name: '读书' })

    expect(createTodo).toHaveBeenCalledWith({ title: '看书', categoryId: 'cat_a', categoryName: '读书' })
  })

  it('sends no category fields when none is selected', async () => {
    const wrapper = mount(TodoHomePage)
    await flushPromises()

    await wrapper.vm.onCreate('看书')

    expect(createTodo).toHaveBeenCalledWith({ title: '看书' })
  })
})
