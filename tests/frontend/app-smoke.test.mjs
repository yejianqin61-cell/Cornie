import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import App from '../../src/renderer/App.vue'
import { createAppRouter } from '../../src/renderer/router'

describe('App smoke', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = String(input)

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
              userText: '',
              cornieText: ''
            }
          }),
          text: async () => ''
        }
      }

      if (url.includes('/api/model/status')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: false,
            configured: false,
            provider: 'deepseek',
            model: 'deepseek-chat',
            reason: 'missing_api_key'
          }),
          text: async () => ''
        }
      }

      if (url.includes('/api/settings/model')) {
        if (init?.method === 'PUT') {
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

        return {
          ok: true,
          status: 200,
          json: async () => ({
            settings: {
              provider: 'deepseek',
              configured: false,
              hasApiKey: false,
              maskedApiKey: '',
              baseUrl: '',
              model: 'deepseek-chat',
              timeoutMs: 30000,
              source: 'empty'
            }
          }),
          text: async () => ''
        }
      }

      if (url.includes('/api/entries')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ entries: [] }),
          text: async () => ''
        }
      }

      if (url.includes('/api/chatlogs')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ dates: [] }),
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
  })

  it('renders onboarding gate when deepseek api key is not configured', async () => {
    const router = createAppRouter()
const wrapper = mount(App, { global: { plugins: [router] } })
await router.isReady()
    await flushPromises()

    expect(wrapper.text()).toContain('先把 DeepSeek 的钥匙交给铃湾吧')
    expect(wrapper.text()).toContain('还没检测到可用钥匙，铃湾需要连上 DeepSeek 才能继续陪你聊天、记日记。')
    expect(wrapper.text()).toContain('保存并检测')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/settings/model'),
      expect.anything()
    )
  })
})
