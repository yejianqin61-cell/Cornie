import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import App from '../../src/renderer/App.vue'
import ChatHome from '../../src/renderer/components/ChatHome.vue'
import { createAppRouter } from '../../src/renderer/router'

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

// F-05：导航由路由驱动——点击导航按钮断言 router 状态与顶部栏文案；
// 子视图事件（go-history）经 App 的 navHandlers 接线到 router.push。
describe('App navigation', () => {
  beforeEach(() => {
    globalThis.fetch = createConfiguredFetchMock()
  })

  it('renders chat workspace and switches to other workspaces via router', async () => {
    const router = createAppRouter()
    const wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: {
          ChatHome: true,
          ChatHistory: true,
          ChatDayView: true,
          DiaryHome: true,
          DiaryEditor: true,
          CornieDiaryReview: true,
          OnThisDayPage: true,
          LedgerHome: true,
          TodoHome: true,
          ScheduleHome: true,
          ObserveMemoryHome: true,
          ObservationList: true,
          ObservationDetail: true,
          MemoryWikiHome: true,
          SettingsHome: true,
          DeepseekConfig: true,
          AdvancedSettings: true
        }
      }
    })
    await router.isReady()
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/chat')
    expect(wrapper.text()).toContain('铃湾在线')

    const navButtons = wrapper.findAll('.navItem')

    await navButtons[2].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/ledger')
    expect(wrapper.text()).toContain('轻松记一笔')

    await navButtons[3].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/todo')
    expect(wrapper.text()).toContain('今天要做什么')

    await navButtons[4].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/schedule')
    expect(wrapper.text()).toContain('接下来的安排')

    await navButtons[5].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/observe')
    expect(wrapper.text()).toContain('观察日志')

    await navButtons[6].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/memory')
    expect(wrapper.text()).toContain('记忆 Wiki')

    await navButtons[7].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/settings')
    expect(wrapper.text()).toContain('铃湾的连接和偏好')

    await navButtons[1].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/diary')
    expect(wrapper.text()).toContain('写下今天的心情')

    // 聊天 → 聊天历史（子视图事件接线）
    await navButtons[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/chat')
    wrapper.findComponent(ChatHome).vm.$emit('go-history')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/chat/history')
  })

  it('resolves all registered routes', () => {
    const router = createAppRouter()
    const checks = [
      ['/chat', 'chat'],
      ['/chat/history', 'chat-history'],
      ['/chat/day/2026-06-27', 'chat-day'],
      ['/diary/editor', 'diary-editor'],
      ['/observe/detail/obs-1', 'observe-detail'],
      ['/memory', 'memory'],
      ['/settings/deepseek', 'settings-deepseek']
    ]
    for (const [path, name] of checks) {
      expect(router.resolve(path).name).toBe(name)
    }
    expect(router.resolve('/unknown-path').name).toBeUndefined()
  })
})
