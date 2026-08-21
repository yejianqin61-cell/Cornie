import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import ChatHistory from '../../src/renderer/ChatHistory.vue'

function createChatlogFetchMock({ shouldFailMessages = false, stringErrorOnMessages = false } = {}) {
  return vi.fn(async (input) => {
    const url = String(input)

    // 日期列表：ChatHistory 会带 scope/limit/cursor（以及可选的 month）请求。
    if (url.includes('/api/chatlogs?') && !url.includes('/api/chatlogs/search')) {
      const month = new URL(url, 'http://localhost').searchParams.get('month')
      if (month === '2026-07') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            entries: [{ date: '2026-07-02', messageCount: 1 }]
          }),
          text: async () => ''
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          entries: [
            { date: '2026-06-27', messageCount: 2 },
            { date: '2026-06-26', messageCount: 1 }
          ]
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/chatlogs/2026-06-27')) {
      if (stringErrorOnMessages) {
        throw '后端炸毛了'
      }
      return {
        ok: !shouldFailMessages,
        status: shouldFailMessages ? 500 : 200,
        json: async () => ({
          messages: [
            { id: 'm1', role: 'user', content: '今天买了龙虾。' },
            { id: 'm2', role: 'assistant', content: '铃湾帮你记下来了。' }
          ]
        }),
        text: async () => (shouldFailMessages ? '读取聊天记录失败' : '')
      }
    }

    if (url.includes('/api/chatlogs/2026-06-26')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          messages: [{ id: 'm3', role: 'assistant', content: '昨天是空白的一天。' }]
        }),
        text: async () => ''
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ entries: [], messages: [] }),
      text: async () => ''
    }
  })
}

describe('ChatHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-27T12:00:00.000+08:00'))
    globalThis.fetch = createChatlogFetchMock()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders date list and chat messages', async () => {
    const wrapper = mount(ChatHistory)
    await flushPromises()

    expect(wrapper.text()).toContain('聊天记录')
    expect(wrapper.text()).toContain('2026-06-27')
    expect(wrapper.text()).toContain('今天买了龙虾。')
    expect(wrapper.text()).toContain('铃湾帮你记下来了。')

    const rows = wrapper.findAll('.historyRow')
    await rows[1].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('昨天是空白的一天。')
  })

  it('shows readable error state when chatlog loading fails', async () => {
    globalThis.fetch = createChatlogFetchMock({ shouldFailMessages: true })
    const wrapper = mount(ChatHistory)
    await flushPromises()

    expect(wrapper.text()).toContain('读取聊天记录失败')
    expect(wrapper.text()).toContain('这一天还没有聊天记录。')
  })

  it('switches to the first available date when month changes and previous selection disappears', async () => {
    const wrapper = mount(ChatHistory)
    await flushPromises()

    // 月份下拉的 v-model 绑定的是只读 computed（activeMonthValue），直接对 select setValue 不会生效；
    // 这里通过组件内部的 selectedMonth ref 触发同一套 watch → 刷新逻辑。
    wrapper.vm.selectedMonth = '2026-07'
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('2026-07-02')
    expect(wrapper.find('.historyContent .historyTitle').text()).toBe('2026-07-02')
  })

  it('falls back to stringified errors when thrown value has no message', async () => {
    globalThis.fetch = createChatlogFetchMock({ stringErrorOnMessages: true })
    const wrapper = mount(ChatHistory)
    await flushPromises()

    expect(wrapper.text()).toContain('后端炸毛了')
    expect(wrapper.text()).toContain('这一天还没有聊天记录。')
  })
})
