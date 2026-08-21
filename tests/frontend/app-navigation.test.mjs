import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'

import App from '../../src/renderer/App.vue'
import ChatHome from '../../src/renderer/components/ChatHome.vue'

function createConfiguredFetchMock() {
  return vi.fn(async (input) => {
    const url = String(input)

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
      return {
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
        text: async () => ''
      }
    }

    if (/\/api\/entries\/[^/]+$/.test(url)) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          entry: {
            date: '2026-06-27',
            userText: '今天吃了很好吃的龙虾。',
            cornieText: '铃湾已经帮你把这份开心记下来了。'
          }
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/entries')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          entries: [
            { date: '2026-06-27', hasUserText: true, hasCornieText: true },
            { date: '2026-06-26', hasUserText: false, hasCornieText: true }
          ]
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/chatlogs')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          entries: [{ date: '2026-06-27', messageCount: 2 }]
        }),
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

describe('App navigation', () => {
  beforeEach(() => {
    globalThis.fetch = createConfiguredFetchMock()
  })

  it('renders chat workspace and switches to other workspaces', async () => {
    const wrapper = shallowMount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('铃湾在线')
    expect(wrapper.find('chat-home-stub').exists()).toBe(true)
    expect(wrapper.find('ledger-home-stub').exists()).toBe(false)

    const navButtons = wrapper.findAll('.navItem')

    await navButtons[2].trigger('click')
    await flushPromises()
    expect(wrapper.find('ledger-home-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('轻松记一笔')

    await navButtons[3].trigger('click')
    await flushPromises()
    expect(wrapper.find('todo-home-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('今天要做什么')

    await navButtons[4].trigger('click')
    await flushPromises()
    expect(wrapper.find('schedule-home-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('接下来的安排')

    await navButtons[5].trigger('click')
    await flushPromises()
    expect(wrapper.find('observe-memory-home-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('想记住的小事')

    await navButtons[6].trigger('click')
    await flushPromises()
    expect(wrapper.find('settings-home-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('铃湾的连接和偏好')

    await navButtons[1].trigger('click')
    await flushPromises()
    expect(wrapper.find('diary-home-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('写下今天的心情')

    // 聊天 → 聊天历史
    await navButtons[0].trigger('click')
    await flushPromises()
    expect(wrapper.find('chat-home-stub').exists()).toBe(true)
    wrapper.findComponent(ChatHome).vm.$emit('go-history')
    await flushPromises()
    expect(wrapper.find('chat-history-stub').exists()).toBe(true)
  })
})
