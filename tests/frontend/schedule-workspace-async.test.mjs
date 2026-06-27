import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import ScheduleWorkspace from '../../src/renderer/components/ScheduleWorkspace.vue'

function createScheduleFetchMock({ failList = false } = {}) {
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
    }
  ]
  const categories = [
    { id: 'schedule-cat-1', name: '聚餐', sortOrder: 10, isActive: true }
  ]

  return vi.fn(async (input, init) => {
    const url = String(input)
    const method = init?.method || 'GET'

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
        return {
          ok: true,
          status: 200,
          json: async () => ({ items }),
          text: async () => ''
        }
      }

      if (method === 'POST' && url.endsWith('/api/schedules')) {
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
    }

    if (url.endsWith('/api/schedule-categories')) {
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

describe('ScheduleWorkspace async flow', () => {
  beforeEach(() => {
    globalThis.fetch = createScheduleFetchMock()
  })

  it('loads schedules and saves a new schedule', async () => {
    const wrapper = mount(ScheduleWorkspace)
    await flushPromises()

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
})
