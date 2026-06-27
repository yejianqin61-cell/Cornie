import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import App from '../../src/renderer/App.vue'

function createSettingsFlowFetchMock(initialState = {}) {
  const state = {
    configured: false,
    maskedApiKey: '',
    reason: 'missing_api_key',
    statusConfigured: undefined,
    statusOk: undefined,
    settingsConfigured: undefined,
    ...initialState
  }

  return vi.fn(async (input, init) => {
    const url = String(input)
    const method = init?.method || 'GET'

    if (url.includes('/api/model/status')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: state.statusOk ?? state.configured,
          configured: state.statusConfigured ?? state.configured,
          provider: 'deepseek',
          model: 'deepseek-chat',
          reason: (state.statusConfigured ?? state.configured) ? '' : state.reason
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/settings/model') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          settings: {
            provider: 'deepseek',
            configured: state.settingsConfigured ?? state.configured,
            hasApiKey: state.settingsConfigured ?? state.configured,
            maskedApiKey: state.maskedApiKey,
            baseUrl: '',
            model: 'deepseek-chat',
            timeoutMs: 30000,
            source: (state.settingsConfigured ?? state.configured) ? 'persisted' : 'empty'
          }
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/settings/model') && method === 'PUT') {
      const payload = JSON.parse(init.body)
      if (!payload.apiKey) {
        return {
          ok: false,
          status: 400,
          json: async () => ({}),
          text: async () => 'apiKey is required'
        }
      }

      state.configured = true
      state.maskedApiKey = 'sk-t***-key'
      state.reason = ''
      state.statusConfigured = true
      state.statusOk = true
      state.settingsConfigured = true

      return {
        ok: true,
        status: 200,
        json: async () => ({
          settings: {
            provider: 'deepseek',
            configured: true,
            hasApiKey: true,
            maskedApiKey: state.maskedApiKey,
            baseUrl: payload.baseUrl || '',
            model: payload.model || 'deepseek-chat',
            timeoutMs: Number(payload.timeoutMs || 30000),
            source: 'persisted'
          }
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/settings/model') && method === 'DELETE') {
      state.configured = false
      state.maskedApiKey = ''
      state.reason = 'missing_api_key'
      state.statusConfigured = false
      state.statusOk = false
      state.settingsConfigured = false

      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
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
            userText: '',
            cornieText: ''
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

describe('App settings async flow', () => {
  beforeEach(() => {
    globalThis.fetch = createSettingsFlowFetchMock()
  })

  it('saves deepseek settings and closes onboarding gate after recheck', async () => {
    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('先把 DeepSeek 的钥匙交给铃湾吧')

    const inputs = wrapper.findAll('.guideForm input')
    await inputs[0].setValue('sk-real-key')
    await inputs[2].setValue('deepseek-chat')
    await inputs[3].setValue('45000')
    await wrapper.get('.guideForm').trigger('submit.prevent')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('铃湾已经拿到钥匙啦')
    expect(wrapper.text()).toContain('当前模型是 deepseek-chat')
    expect(wrapper.text()).toContain('已保存：sk-t***-key')
  })

  it('clears persisted settings and returns to onboarding state', async () => {
    const fetchMock = createSettingsFlowFetchMock({
      configured: true,
      maskedApiKey: 'sk-t***-key',
      statusConfigured: false,
      statusOk: false,
      settingsConfigured: true,
      reason: 'request_failed'
    })
    globalThis.fetch = fetchMock

    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('清空已保存钥匙')
    await wrapper.get('.dangerBtn').trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('先把 DeepSeek 的钥匙交给铃湾吧')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/settings/model'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('shows friendly validation copy when save fails', async () => {
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('.guideForm').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('API Key 这一栏还是空的，铃湾还没拿到钥匙呢。')
  })
})
