import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import App from '../../src/renderer/App.vue'

function createDiaryFlowFetchMock({ failSave = false, failOnThisDay = false, failEntriesString = false, emptyOnThisDay = false } = {}) {
  const entriesByDate = {
    '2026-06-27': {
      date: '2026-06-27',
      userText: '今天和铃湾聊了龙虾。',
      cornieText: '铃湾已经闻到海风味道啦。'
    },
    '2026-06-26': {
      date: '2026-06-26',
      userText: '昨天去买菜。',
      cornieText: '昨天也是很认真的一天。'
    }
  }

  return vi.fn(async (input, init) => {
    const url = String(input)
    const method = init?.method || 'GET'

    if (url.includes('/api/model/status')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          configured: true,
          provider: 'deepseek',
          model: 'deepseek-chat',
          reason: ''
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/settings/model')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          settings: {
            provider: 'deepseek',
            configured: true,
            hasApiKey: true,
            maskedApiKey: 'sk-t***-key',
            baseUrl: '',
            model: 'deepseek-chat',
            timeoutMs: 30000,
            source: 'persisted'
          }
        }),
        text: async () => ''
      }
    }

    if (/\/api\/entries\/[^/]+\/on-this-day/.test(url)) {
      if (failOnThisDay) {
        return {
          ok: false,
          status: 500,
          json: async () => ({}),
          text: async () => '往年今日加载失败'
        }
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: emptyOnThisDay
            ? []
            : [
                {
                  date: '2025-06-27',
                  userText: '去年也提到过龙虾。',
                  cornieText: '那时候铃湾还不在。'
                }
              ]
        }),
        text: async () => ''
      }
    }

    if (/\/api\/entries\/[^/]+\/regenerate-cornie$/.test(url) && method === 'POST') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          entry: {
            ...entriesByDate['2026-06-27'],
            cornieText: '铃湾认真地把这份龙虾快乐写好了。'
          }
        }),
        text: async () => ''
      }
    }

    if (/\/api\/entries\/[^/]+$/.test(url) && method === 'PUT') {
      if (failSave) {
        return {
          ok: false,
          status: 500,
          json: async () => ({}),
          text: async () => '保存日记失败'
        }
      }

      const date = decodeURIComponent(url.match(/\/api\/entries\/([^/?]+)/)[1])
      const payload = JSON.parse(init.body)
      entriesByDate[date] = {
        date,
        userText: payload.userText,
        cornieText: payload.cornieText
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          entry: entriesByDate[date]
        }),
        text: async () => ''
      }
    }

    if (/\/api\/entries\/[^/]+$/.test(url)) {
      const date = decodeURIComponent(url.match(/\/api\/entries\/([^/?]+)/)[1])
      return {
        ok: true,
        status: 200,
        json: async () => ({
          entry: entriesByDate[date] || {
            date,
            userText: '',
            cornieText: ''
          }
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/entries')) {
      if (failEntriesString) {
        throw '列表忽然失踪了'
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          entries: [
            { date: '2026-06-27', hasUserText: true, hasCornieText: true },
            { date: '2026-06-26', hasUserText: true, hasCornieText: true }
          ]
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/chatlogs')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ entries: [] }),
        text: async () => ''
      }
    }

    if (url.includes('/api/conversations/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ messages: [] }),
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

describe('App diary flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-27T12:00:00.000+08:00'))
    globalThis.fetch = createDiaryFlowFetchMock()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function openDiaryEditor(wrapper) {
    await wrapper.findAll('.navItem')[1].trigger('click')
    await flushPromises()
    const writeButton = wrapper.findAll('button').find((button) => button.text() === '写日记')
    await writeButton.trigger('click')
    await flushPromises()
  }

  it('loads diary entries, switches dates, saves edits, and regenerates cornie text', async () => {
    const wrapper = mount(App)
    await flushPromises()
    await openDiaryEditor(wrapper)

    const textareas = wrapper.findAll('textarea')
    expect(textareas[0].element.value).toBe('今天和铃湾聊了龙虾。')
    expect(wrapper.text()).toContain('去年也提到过龙虾。')

    const rows = wrapper.findAll('.dateRow')
    await rows[1].trigger('click')
    await flushPromises()

    const switchedTextareas = wrapper.findAll('textarea')
    expect(switchedTextareas[0].element.value).toBe('昨天去买菜。')

    await wrapper.findAll('.dateRow')[0].trigger('click')
    await flushPromises()

    const activeTextareas = wrapper.findAll('textarea')
    await activeTextareas[0].setValue('今天和铃湾认真记账。')
    expect(wrapper.text()).toContain('未保存更改')

    const saveButton = wrapper.findAll('.topActions button').find((button) => button.text() === '保存')
    await saveButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('已同步')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/entries/2026-06-27'),
      expect.objectContaining({ method: 'PUT' })
    )

    const regenButton = wrapper.findAll('button').find((button) => button.text() === '让铃湾写一篇')
    await regenButton.trigger('click')
    await flushPromises()
    await flushPromises()

    const regeneratedTextareas = wrapper.findAll('textarea')
    expect(regeneratedTextareas[1].element.value).toBe('铃湾认真地把这份龙虾快乐写好了。')
  })

  it('shows readable on-this-day error cards when historical load fails', async () => {
    globalThis.fetch = createDiaryFlowFetchMock({ failOnThisDay: true })
    const wrapper = mount(App)
    await flushPromises()
    await openDiaryEditor(wrapper)

    expect(wrapper.text()).toContain('加载失败：往年今日加载失败')
  })

  it('shows save error when diary persistence fails', async () => {
    globalThis.fetch = createDiaryFlowFetchMock({ failSave: true })
    const wrapper = mount(App)
    await flushPromises()
    await openDiaryEditor(wrapper)

    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('今天补一条失败测试。')

    const saveButton = wrapper.findAll('.topActions button').find((button) => button.text() === '保存')
    await saveButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('保存日记失败')
    expect(wrapper.text()).toContain('未保存更改')
  })

  it('shows empty on-this-day copy and refreshes month list changes', async () => {
    globalThis.fetch = createDiaryFlowFetchMock({ emptyOnThisDay: true })
    const wrapper = mount(App)
    await flushPromises()
    await openDiaryEditor(wrapper)

    expect(wrapper.text()).toContain('那时候我还没出生呢，不过现在我在了。')

    const monthInput = wrapper.get('.monthInput')
    await monthInput.setValue('2026-07')
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/entries?month=2026-07'),
      expect.anything()
    )
  })

  it('shows stringified list errors when monthly entries request throws a raw string', async () => {
    globalThis.fetch = createDiaryFlowFetchMock({ failEntriesString: true })
    const wrapper = mount(App)
    await flushPromises()
    await openDiaryEditor(wrapper)

    expect(wrapper.findAll('.dateRow')).toHaveLength(0)
    expect(wrapper.text()).toContain('2026-06-27')
  })
})
