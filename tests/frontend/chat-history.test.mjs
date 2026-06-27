import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import ChatHistory from '../../src/renderer/ChatHistory.vue'

function createChatlogFetchMock({ shouldFailMessages = false } = {}) {
  return vi.fn(async (input) => {
    const url = String(input)

    if (url.includes('/api/chatlogs?month=')) {
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
    globalThis.fetch = createChatlogFetchMock()
  })

  it('renders date list and chat messages', async () => {
    const wrapper = mount(ChatHistory)
    await flushPromises()

    expect(wrapper.text()).toContain('聊天历史')
    expect(wrapper.text()).toContain('2026-06-27')
    expect(wrapper.text()).toContain('今天买了龙虾。')
    expect(wrapper.text()).toContain('铃湾')

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
})
