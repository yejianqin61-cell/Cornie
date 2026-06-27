import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import TodoWorkspace from '../../src/renderer/components/TodoWorkspace.vue'

function createTodoFetchMock({ failList = false } = {}) {
  const items = [
    {
      id: 'todo-1',
      title: '整理龙虾账单',
      description: '把昨天的聚餐补进记账本',
      categoryId: 'todo-cat-1',
      categoryName: '记账',
      dueAt: '2026-06-28T10:00:00.000Z',
      status: 'open'
    }
  ]
  const categories = [
    { id: 'todo-cat-1', name: '记账', sortOrder: 10, isActive: true }
  ]

  return vi.fn(async (input, init) => {
    const url = String(input)
    const method = init?.method || 'GET'

    if (url.includes('/api/todos')) {
      if (method === 'GET') {
        if (failList) {
          return {
            ok: false,
            status: 500,
            json: async () => ({}),
            text: async () => '待办列表加载失败'
          }
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ items }),
          text: async () => ''
        }
      }

      if (method === 'POST' && url.endsWith('/api/todos')) {
        const payload = JSON.parse(init.body)
        items.unshift({
          id: 'todo-2',
          title: payload.title,
          description: payload.description,
          categoryId: payload.categoryId || '',
          categoryName: '记账',
          dueAt: payload.dueAt || '',
          status: 'open'
        })
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
      }

      if (method === 'POST' && url.includes('/complete')) {
        const id = url.split('/').slice(-2)[0]
        const target = items.find((item) => item.id === id)
        if (target) target.status = 'done'
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
      }

      if (method === 'POST' && url.includes('/reopen')) {
        const id = url.split('/').slice(-2)[0]
        const target = items.find((item) => item.id === id)
        if (target) target.status = 'open'
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
      }

      if (method === 'PUT') {
        const id = url.split('/').pop()
        const payload = JSON.parse(init.body)
        const target = items.find((item) => item.id === id)
        if (target) {
          target.title = payload.title
          target.description = payload.description ?? target.description
        }
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
      }

      if (method === 'DELETE') {
        const id = url.split('/').pop()
        const index = items.findIndex((item) => item.id === id)
        if (index >= 0) items.splice(index, 1)
        return { ok: true, status: 204, json: async () => ({}), text: async () => '' }
      }
    }

    if (url.endsWith('/api/todo-categories')) {
      if (method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: categories }),
          text: async () => ''
        }
      }

      if (method === 'POST') {
        const payload = JSON.parse(init.body)
        categories.push({
          id: `todo-cat-${categories.length + 1}`,
          name: payload.name,
          sortOrder: payload.sortOrder,
          isActive: true
        })
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
      }
    }

    if (url.includes('/api/todo-categories/') && method === 'PUT') {
      const id = url.split('/').pop()
      const payload = JSON.parse(init.body)
      const category = categories.find((item) => item.id === id)
      if (category && typeof payload.isActive === 'boolean') {
        category.isActive = payload.isActive
      }
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
    }

    if (url.includes('/api/todo-categories/') && url.endsWith('/restore') && method === 'POST') {
      const id = url.split('/').slice(-2)[0]
      const category = categories.find((item) => item.id === id)
      if (category) category.isActive = true
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
    }

    if (url.includes('/api/todo-categories/') && url.endsWith('/reorder') && method === 'POST') {
      const id = url.split('/').slice(-2)[0]
      const payload = JSON.parse(init.body)
      const category = categories.find((item) => item.id === id)
      if (category) category.sortOrder = payload.sortOrder
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => ''
    }
  })
}

describe('TodoWorkspace async flow', () => {
  beforeEach(() => {
    globalThis.fetch = createTodoFetchMock()
  })

  it('loads todo list and saves a new todo', async () => {
    const wrapper = mount(TodoWorkspace)
    await flushPromises()

    expect(wrapper.text()).toContain('整理龙虾账单')

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('补写观察日志')
    await wrapper.get('textarea').setValue('把龙虾相关观察补齐')
    await wrapper.get('.actionRow button').trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('补写观察日志')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/todos'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('shows readable error when list loading fails', async () => {
    globalThis.fetch = createTodoFetchMock({ failList: true })
    const wrapper = mount(TodoWorkspace)
    await flushPromises()

    expect(wrapper.text()).toContain('待办列表加载失败')
  })

  it('supports complete, reopen, delete, and category management flows', async () => {
    const wrapper = mount(TodoWorkspace)
    await flushPromises()

    const row = wrapper.find('.entryRow')
    await row.trigger('click')
    await flushPromises()

    const actionButtons = wrapper.findAll('.actionRow button')
    await actionButtons[1].trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('done')

    await wrapper.findAll('.cardFilters button')[1].trigger('click')
    await flushPromises()
    const reopenedButtons = wrapper.findAll('.actionRow button')
    await reopenedButtons[1].trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('open')

    await wrapper.find('.dangerGhost').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).not.toContain('整理龙虾账单')

    const categoryInputs = wrapper.findAll('.categoryCreator input')
    await categoryInputs[0].setValue('采购')
    await categoryInputs[1].setValue('20')
    await wrapper.find('.categoryCreator button').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('采购')

    const miniButtons = wrapper.findAll('.miniActions button')
    await miniButtons[0].trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('排序 0')

    await miniButtons[2].trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('已停用')
  })
})
