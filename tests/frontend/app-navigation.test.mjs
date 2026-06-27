import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'

import App from '../../src/renderer/App.vue'

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

  it('renders diary workspace and switches to other workspaces', async () => {
    const wrapper = shallowMount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('铃湾已经拿到钥匙啦')
    expect(wrapper.text()).toContain('本月条目')
    expect(wrapper.find('ledger-workspace-stub').exists()).toBe(false)

    const navButtons = wrapper.findAll('.navItem')

    await navButtons[1].trigger('click')
    await flushPromises()
    expect(wrapper.find('ledger-workspace-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('记录收入支出与类目')

    await navButtons[4].trigger('click')
    await flushPromises()
    expect(wrapper.find('memory-wiki-workspace-stub').exists()).toBe(true)

    await navButtons[5].trigger('click')
    await flushPromises()
    expect(wrapper.find('chat-history-stub').exists()).toBe(true)
  })
})
