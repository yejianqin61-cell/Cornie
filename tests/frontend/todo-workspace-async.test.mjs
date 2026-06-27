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
        items[0].status = 'done'
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
      }
    }

    if (url.endsWith('/api/todo-categories')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ items: categories }),
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
})
