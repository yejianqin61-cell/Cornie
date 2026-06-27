import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import App from '../../src/renderer/App.vue'

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
    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('先把 DeepSeek 的钥匙交给铃湾吧')
    expect(wrapper.text()).toContain('联网和隐私要知道什么？')
    expect(wrapper.text()).toContain('保存并重新检测')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/entries/'),
      expect.anything()
    )
  })
})
