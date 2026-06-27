import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import ScheduleWorkspace from '../../src/renderer/components/ScheduleWorkspace.vue'

function createScheduleFetchMock({ failList = false, failSave = false, failCategorySave = false } = {}) {
  const items = [
    {
      id: 'schedule-1',
      title: '周日晚吃龙虾',
      description: '记得提前订位',
      categoryId: 'schedule-cat-1',
      categoryName: '聚餐',
      startAt: '2026-06-29T18:00:00.000Z',
      endAt: '2026-06-29T20:00:00.000Z',
      location: '滨海餐厅',
      status: 'scheduled'
    },
    {
      id: 'schedule-2',
      title: '取消的散步提醒',
      description: '',
      categoryId: '',
      categoryName: '',
      startAt: '',
      endAt: '',
      location: '',
      status: 'cancelled'
    }
  ]
  const categories = [
    { id: 'schedule-cat-1', name: '聚餐', sortOrder: 10, isActive: true }
  ]

  return vi.fn(async (input, init) => {
    const url = String(input)
    const method = init?.method || 'GET'
    const parsedUrl = new URL(url, 'http://localhost')

    if (url.includes('/api/schedules')) {
      if (method === 'GET') {
        if (failList) {
          return {
            ok: false,
            status: 500,
            json: async () => ({}),
            text: async () => '日程列表加载失败'
          }
        }
        const view = parsedUrl.searchParams.get('view')
        const filtered = items.filter((item) => {
          if (view === 'cancelled') return item.status === 'cancelled'
          return item.status !== 'cancelled'
        })
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: filtered }),
          text: async () => ''
        }
      }

      if (method === 'POST' && url.endsWith('/api/schedules')) {
        if (failSave) {
          return { ok: false, status: 500, json: async () => ({}), text: async () => '保存日程失败' }
        }
        const payload = JSON.parse(init.body)
        items.unshift({
          id: 'schedule-2',
          title: payload.title,
          description: payload.description,
          categoryId: payload.categoryId || '',
          categoryName: '聚餐',
          startAt: payload.startAt,
          endAt: payload.endAt,
          location: payload.location || '',
          status: 'scheduled'
        })
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
      }

      if (method === 'PUT') {
        const id = url.split('/').pop()
        const payload = JSON.parse(init.body)
        const target = items.find((item) => item.id === id)
        if (target) {
          target.title = payload.title
          target.description = payload.description ?? target.description
          target.location = payload.location ?? target.location
        }
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
      }

      if (method === 'DELETE') {
        const id = url.split('/').pop()
        const index = items.findIndex((item) => item.id === id)
        if (index >= 0) items.splice(index, 1)
        return { ok: true, status: 204, json: async () => ({}), text: async () => '' }
      }

      if (method === 'POST' && url.includes('/cancel')) {
        const id = url.split('/').slice(-2)[0]
        const target = items.find((item) => item.id === id)
        if (target) target.status = 'cancelled'
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
      }

      if (method === 'POST' && url.includes('/restore')) {
        const id = url.split('/').slice(-2)[0]
        const target = items.find((item) => item.id === id)
        if (target) target.status = 'scheduled'
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
      }
    }

    if (url.endsWith('/api/schedule-categories')) {
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
          return { ok: false, status: 500, json: async () => ({}), text: async () => '保存日程类目失败' }
        }
        const payload = JSON.parse(init.body)
        categories.push({
          id: `schedule-cat-${categories.length + 1}`,
          name: payload.name,
          sortOrder: payload.sortOrder,
          isActive: true
        })
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
      }
    }

    if (url.includes('/api/schedule-categories/') && method === 'PUT') {
      const id = url.split('/').pop()
      const payload = JSON.parse(init.body)
      const category = categories.find((item) => item.id === id)
      if (category && typeof payload.isActive === 'boolean') {
        category.isActive = payload.isActive
      }
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
    }

    if (url.includes('/api/schedule-categories/') && url.endsWith('/restore') && method === 'POST') {
      const id = url.split('/').slice(-2)[0]
      const category = categories.find((item) => item.id === id)
      if (category) category.isActive = true
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
    }

    if (url.includes('/api/schedule-categories/') && url.endsWith('/reorder') && method === 'POST') {
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

describe('ScheduleWorkspace async flow', () => {
  beforeEach(() => {
    globalThis.fetch = createScheduleFetchMock()
  })

  it('loads schedules and saves a new schedule', async () => {
    const wrapper = mount(ScheduleWorkspace)
    await flushPromises()

    expect(wrapper.text()).toContain('日程工作台')
    expect(wrapper.text()).toContain('日程类目管理')
    expect(wrapper.text()).toContain('当前查看：未来日程')
    expect(wrapper.text()).toContain('周日晚吃龙虾')

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('复盘龙虾计划')
    await wrapper.get('textarea').setValue('顺便讨论长期记忆整理')
    await inputs[2].setValue('书房')
    await inputs[3].setValue('2026-06-30T21:00')
    await inputs[4].setValue('2026-06-30T22:00')
    await wrapper.get('.actionRow button').trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('复盘龙虾计划')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/schedules'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('shows readable error when schedule list loading fails', async () => {
    globalThis.fetch = createScheduleFetchMock({ failList: true })
    const wrapper = mount(ScheduleWorkspace)
    await flushPromises()

    expect(wrapper.text()).toContain('日程列表加载失败')
  })

  it('supports cancel, restore, delete, and category management flows', async () => {
    const wrapper = mount(ScheduleWorkspace)
    await flushPromises()

    await wrapper.find('.entryRow').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('如果计划变动，可以先取消；如果这条安排彻底无效，再删除也不迟。')

    const actionButtons = wrapper.findAll('.actionRow button')
    await actionButtons[1].trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).not.toContain('周日晚吃龙虾')

    await wrapper.findAll('.cardFilters button')[1].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('当前查看：已取消日程')
    expect(wrapper.text()).toContain('周日晚吃龙虾')
    await wrapper.find('.entryRow').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('这条日程目前已经取消了。如果计划恢复，就把它重新放回未来安排里。')
    const restoreButtons = wrapper.findAll('.actionRow button')
    await restoreButtons[1].trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).not.toContain('周日晚吃龙虾')

    await wrapper.find('.entryRow').trigger('click')
    await flushPromises()
    await wrapper.find('.dangerGhost').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).not.toContain('周日晚吃龙虾')

    const categoryInputs = wrapper.findAll('.categoryCreator input')
    await categoryInputs[0].setValue('会议')
    await categoryInputs[1].setValue('20')
    await wrapper.find('.categoryCreator button').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('会议')

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
    const wrapper = mount(ScheduleWorkspace)
    await flushPromises()

    expect(wrapper.text()).toContain('周日晚吃龙虾')
    expect(wrapper.text()).toContain('聚餐 · scheduled')

    await wrapper.findAll('.cardFilters button')[1].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('取消的散步提醒')
    expect(wrapper.text()).toContain('未分类 · cancelled')
    expect(wrapper.text()).toContain('未设时间')

    const row = wrapper.find('.entryRow')
    await row.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('当前正在整理这条安排的时间、地点和说明。')
    expect(wrapper.find('input[placeholder="可选"]').element.value).toBe('')

    const resetButton = wrapper.findAll('button').find((button) => button.text() === '新建一条')
    await resetButton.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('新增日程')
    expect(wrapper.text()).toContain('先写标题，再慢慢补时间、地点和背景说明。')
  })

  it('submits category default sort order and shows readable save failures', async () => {
    globalThis.fetch = createScheduleFetchMock({ failSave: true, failCategorySave: true })
    const wrapper = mount(ScheduleWorkspace)
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('失败日程')
    await wrapper.get('.actionRow button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('保存日程失败')

    globalThis.fetch = createScheduleFetchMock()
    const successWrapper = mount(ScheduleWorkspace)
    await flushPromises()

    const categoryInputs = successWrapper.findAll('.categoryCreator input')
    await categoryInputs[0].setValue('学习')
    await successWrapper.find('.categoryCreator button').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/schedule-categories'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: '学习', sortOrder: 0 }) })
    )

    globalThis.fetch = createScheduleFetchMock({ failCategorySave: true })
    const failCategoryWrapper = mount(ScheduleWorkspace)
    await flushPromises()
    const failCategoryInputs = failCategoryWrapper.findAll('.categoryCreator input')
    await failCategoryInputs[0].setValue('失败类目')
    await failCategoryWrapper.find('.categoryCreator button').trigger('click')
    await flushPromises()
    expect(failCategoryWrapper.text()).toContain('保存日程类目失败')
  })

  it('shows cancelled view summary after restoring one cancelled schedule', async () => {
    const wrapper = mount(ScheduleWorkspace)
    await flushPromises()

    await wrapper.find('.entryRow').trigger('click')
    await flushPromises()
    const actionButtons = wrapper.findAll('.actionRow button')
    await actionButtons[1].trigger('click')
    await flushPromises()
    await flushPromises()

    await wrapper.findAll('.cardFilters button')[1].trigger('click')
    await flushPromises()
    const cancelledRows = wrapper.findAll('.entryRow')
    const restoredRow = cancelledRows.find((entry) => entry.text().includes('周日晚吃龙虾'))
    await restoredRow.trigger('click')
    await flushPromises()
    const restoreButtons = wrapper.findAll('.actionRow button')
    await restoreButtons[1].trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('当前查看：已取消日程')
    expect(wrapper.text()).toContain('取消的散步提醒')
  })
})
