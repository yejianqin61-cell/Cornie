import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import TodoWorkspace from '../../src/renderer/components/TodoWorkspace.vue'

function createTodoFetchMock({ failList = false, failSave = false, failCategorySave = false } = {}) {
  const items = [
    {
      id: 'todo-1',
      title: '整理龙虾账单',
      description: '把昨天的聚餐补进记账本',
      categoryId: 'todo-cat-1',
      categoryName: '记账',
      dueAt: '2026-06-28T10:00:00.000Z',
      status: 'open'
    },
    {
      id: 'todo-2',
      title: '已经完成的观察整理',
      description: '',
      categoryId: '',
      categoryName: '',
      dueAt: '',
      status: 'done'
    }
  ]
  const categories = [
    { id: 'todo-cat-1', name: '记账', sortOrder: 10, isActive: true }
  ]

  return vi.fn(async (input, init) => {
    const url = String(input)
    const method = init?.method || 'GET'
    const parsedUrl = new URL(url, 'http://localhost')

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
        const view = parsedUrl.searchParams.get('view')
        const filtered = items.filter((item) => {
          if (view === 'completed') return item.status === 'done'
          return item.status !== 'done'
        })
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: filtered }),
          text: async () => ''
        }
      }

      if (method === 'POST' && url.endsWith('/api/todos')) {
        if (failSave) {
          return { ok: false, status: 500, json: async () => ({}), text: async () => '保存待办失败' }
        }
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
        if (failCategorySave) {
          return { ok: false, status: 500, json: async () => ({}), text: async () => '保存待办类目失败' }
        }
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

    expect(wrapper.text()).toContain('待办工作台')
    expect(wrapper.text()).toContain('待办类目管理')
    expect(wrapper.text()).toContain('当前查看：未完成事项')
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
    expect(wrapper.text()).toContain('确认做完后可以直接标记完成；如果不再需要，也可以删除它。')

    const actionButtons = wrapper.findAll('.actionRow button')
    await actionButtons[1].trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).not.toContain('整理龙虾账单')

    await wrapper.findAll('.cardFilters button')[1].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('当前查看：已完成事项')
    expect(wrapper.text()).toContain('整理龙虾账单')
    await wrapper.find('.entryRow').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('这条待办已经完成了。如果还有后续，可以重新打开继续跟进。')
    const reopenedButtons = wrapper.findAll('.actionRow button')
    await reopenedButtons[1].trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).not.toContain('整理龙虾账单')

    await wrapper.findAll('.cardFilters button')[0].trigger('click')
    await flushPromises()
    await wrapper.find('.entryRow').trigger('click')
    await flushPromises()
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
    expect(wrapper.findAll('.categoryCard')[0].classes()).toContain('inactive')

    const restoreCategoryButton = wrapper.findAll('.miniActions button')[2]
    await restoreCategoryButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('启用中')
  })

  it('supports view switching, empty fallback text, and reset to create mode', async () => {
    const wrapper = mount(TodoWorkspace)
    await flushPromises()

    expect(wrapper.text()).toContain('整理龙虾账单')
    expect(wrapper.text()).toContain('记账 · open')

    await wrapper.findAll('.cardFilters button')[1].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('已经完成的观察整理')
    expect(wrapper.text()).toContain('未分类 · done')
    expect(wrapper.text()).toContain('未设日期')

    const row = wrapper.find('.entryRow')
    await row.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('当前正在整理这条待办的标题、说明和截止时间。')

    const resetButton = wrapper.findAll('button').find((button) => button.text() === '新建一条')
    await resetButton.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('新增待办')
    expect(wrapper.text()).toContain('先写标题，再决定要不要补类目和截止时间。')
  })

  it('submits category default sort order and shows readable save failures', async () => {
    globalThis.fetch = createTodoFetchMock({ failSave: true, failCategorySave: true })
    const wrapper = mount(TodoWorkspace)
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('失败待办')
    await wrapper.get('.actionRow button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('保存待办失败')

    globalThis.fetch = createTodoFetchMock()
    const successWrapper = mount(TodoWorkspace)
    await flushPromises()

    const categoryInputs = successWrapper.findAll('.categoryCreator input')
    await categoryInputs[0].setValue('学习')
    await successWrapper.find('.categoryCreator button').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/todo-categories'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: '学习', sortOrder: 0 }) })
    )

    globalThis.fetch = createTodoFetchMock({ failCategorySave: true })
    const failCategoryWrapper = mount(TodoWorkspace)
    await flushPromises()
    const failCategoryInputs = failCategoryWrapper.findAll('.categoryCreator input')
    await failCategoryInputs[0].setValue('失败类目')
    await failCategoryWrapper.find('.categoryCreator button').trigger('click')
    await flushPromises()
    expect(failCategoryWrapper.text()).toContain('保存待办类目失败')
  })

  it('shows completed view summary after reopening one completed todo', async () => {
    const wrapper = mount(TodoWorkspace)
    await flushPromises()

    await wrapper.find('.entryRow').trigger('click')
    await flushPromises()
    const actionButtons = wrapper.findAll('.actionRow button')
    await actionButtons[1].trigger('click')
    await flushPromises()
    await flushPromises()

    await wrapper.findAll('.cardFilters button')[1].trigger('click')
    await flushPromises()
    const completedRows = wrapper.findAll('.entryRow')
    const reopenedRow = completedRows.find((entry) => entry.text().includes('整理龙虾账单'))
    await reopenedRow.trigger('click')
    await flushPromises()
    const reopenedButtons = wrapper.findAll('.actionRow button')
    await reopenedButtons[1].trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('当前查看：已完成事项')
    expect(wrapper.text()).toContain('已经完成的观察整理')
  })
})
