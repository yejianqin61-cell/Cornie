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
    failStatus: false,
    failStatusMessage: 'network timeout',
    failRefreshStatusOnce: false,
    putErrorText: null,
    deleteErrorText: null,
    settingsModel: 'deepseek-chat',
    settingsTimeoutMs: 30000,
    settingsBaseUrl: '',
    ...initialState
  }

  return vi.fn(async (input, init) => {
    const url = String(input)
    const method = init?.method || 'GET'

    if (url.includes('/api/model/status')) {
      if (state.failStatus || state.failRefreshStatusOnce) {
        if (state.failRefreshStatusOnce) {
          state.failRefreshStatusOnce = false
        }
        return {
          ok: false,
          status: 503,
          json: async () => ({}),
          text: async () => state.failStatusMessage
        }
      }

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
            baseUrl: state.settingsBaseUrl,
            model: state.settingsModel,
            timeoutMs: state.settingsTimeoutMs,
            source: (state.settingsConfigured ?? state.configured) ? 'persisted' : 'empty'
          }
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/settings/model') && method === 'PUT') {
      const payload = JSON.parse(init.body)
      if (state.putErrorText !== null) {
        return {
          ok: false,
          status: 400,
          json: async () => ({}),
          text: async () => state.putErrorText
        }
      }

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
      if (state.deleteErrorText !== null) {
        return {
          ok: false,
          status: 500,
          json: async () => ({}),
          text: async () => state.deleteErrorText
        }
      }

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

  it('shows friendly validation copy when api key is missing', async () => {
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('.guideForm').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('API Key 这一栏还是空的，铃湾还没拿到钥匙呢。')
  })

  it('maps timeout and unknown save errors to friendly copy', async () => {
    globalThis.fetch = createSettingsFlowFetchMock({
      putErrorText: 'invalid timeout'
    })

    const timeoutWrapper = mount(App)
    await flushPromises()
    const timeoutInputs = timeoutWrapper.findAll('.guideForm input')
    await timeoutInputs[0].setValue('sk-real-key')
    await timeoutWrapper.get('.guideForm').trigger('submit.prevent')
    await flushPromises()
    expect(timeoutWrapper.text()).toContain('超时毫秒要填成正整数呀，比如 30000。')

    globalThis.fetch = createSettingsFlowFetchMock({
      putErrorText: 'strange backend copy'
    })

    const unknownWrapper = mount(App)
    await flushPromises()
    const unknownInputs = unknownWrapper.findAll('.guideForm input')
    await unknownInputs[0].setValue('sk-real-key')
    await unknownWrapper.get('.guideForm').trigger('submit.prevent')
    await flushPromises()
    expect(unknownWrapper.text()).toContain('这次保存没成功，不过别担心，我们检查一下输入内容再试一次就好。')
  })

  it('shows friendly request failure copy and supports recheck button', async () => {
    const fetchMock = createSettingsFlowFetchMock({
      failStatus: true,
      failStatusMessage: 'network timeout'
    })
    globalThis.fetch = fetchMock

    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('铃湾刚刚去敲门时没收到顺利回应，可能是网络、地址或者钥匙状态出了点小岔子。')
    expect(wrapper.text()).toContain('先确认 API Key 已经完整贴进来，不要漏掉开头或结尾。')

    const recheckButton = wrapper.findAll('.guideActions button').find((button) => button.text() === '只重新检测')
    await recheckButton.trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/model/status'),
      expect.anything()
    )
  })

  it('refreshes configured model summary state', async () => {
    const fetchMock = createSettingsFlowFetchMock({
      configured: true,
      maskedApiKey: 'sk-t***-key',
      statusConfigured: true,
      statusOk: true,
      settingsConfigured: true
    })
    globalThis.fetch = fetchMock

    const wrapper = mount(App)
    await flushPromises()

    const refreshButton = wrapper.find('.modelRetry')
    await refreshButton.trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/settings/model'),
      expect.anything()
    )
  })

  it('falls back to saved model name when status model is empty and applies default form values', async () => {
    globalThis.fetch = createSettingsFlowFetchMock({
      configured: true,
      maskedApiKey: 'sk-t***-key',
      statusConfigured: true,
      statusOk: true,
      settingsConfigured: true,
      settingsModel: '',
      settingsTimeoutMs: null
    })

    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('当前模型是 deepseek-chat')
    expect(wrapper.text()).toContain('已保存：sk-t***-key')
  })

  it('shows friendly copy when clearing persisted settings fails', async () => {
    globalThis.fetch = createSettingsFlowFetchMock({
      configured: true,
      maskedApiKey: 'sk-t***-key',
      statusConfigured: false,
      statusOk: false,
      settingsConfigured: true,
      reason: 'request_failed',
      deleteErrorText: ''
    })

    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('.dangerBtn').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('这次保存没成功，不过别担心，我们检查一下输入内容再试一次就好。')
  })
})
