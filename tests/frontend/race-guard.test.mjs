import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'

import { useRequestGuard } from '../../src/renderer/composables/useRequestGuard'
import ChatHistory from '../../src/renderer/ChatHistory.vue'

function deferred() {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}

function jsonResolve(body) {
  return { ok: true, status: 200, json: async () => body }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FE-05 竞态守卫', () => {
  it('begin 使旧 token 失效并中止旧请求', () => {
    const Comp = defineComponent({
      template: '<div/>',
      setup() {
        return { guard: useRequestGuard() }
      }
    })
    const wrapper = mount(Comp)
    const guard = wrapper.vm.guard

    const first = guard.begin('k')
    expect(guard.isCurrent('k', first.token)).toBe(true)
    expect(first.signal.aborted).toBe(false)

    const second = guard.begin('k')
    expect(guard.isCurrent('k', first.token)).toBe(false)
    expect(guard.isCurrent('k', second.token)).toBe(true)
    expect(first.signal.aborted).toBe(true)
    expect(second.signal.aborted).toBe(false)

    guard.end('k', second.token)
    wrapper.unmount()
  })

  it('ChatHistory 快速切换日期：最终渲染最新选择，旧响应被丢弃', async () => {
    const pending = {}

    globalThis.fetch = vi.fn((url) => {
      const u = String(url)
      if (u.includes('/api/chatlogs?')) {
        return Promise.resolve(
          jsonResolve({ entries: [{ date: '2026-08-20' }, { date: '2026-08-21' }], availableMonths: [] })
        )
      }
      const m = u.match(/\/api\/chatlogs\/(2026-08-\d{2})/)
      if (m) {
        const d = deferred()
        pending[m[1]] = pending[m[1]] || []
        pending[m[1]].push(d)
        return d.promise
      }
      return Promise.resolve(jsonResolve({}))
    })

    const wrapper = mount(ChatHistory)
    await flushPromises()

    // 初始 selectedDate = 今天(2026-08-21)，消息请求挂起
    expect(pending['2026-08-21']?.length).toBeGreaterThanOrEqual(1)

    // 快速切到 2026-08-20（旧请求被守卫中止）
    wrapper.vm.selectedDate = '2026-08-20'
    await flushPromises()
    expect(pending['2026-08-20']?.length).toBeGreaterThanOrEqual(1)

    // 旧日期(21)的响应后到：应被丢弃（不覆盖 20 的视图）
    for (const d of pending['2026-08-21'] ?? []) {
      d.resolve(jsonResolve({ messages: [{ id: 'm21', role: 'user', content: '旧日期消息' }] }))
    }
    await flushPromises()
    expect(wrapper.text()).not.toContain('旧日期消息')

    // 最新选择(20)完成：显示 20 的内容
    for (const d of pending['2026-08-20']) {
      d.resolve(jsonResolve({ messages: [{ id: 'm20', role: 'user', content: '新日期消息' }] }))
    }
    await flushPromises()
    expect(wrapper.text()).toContain('新日期消息')
    expect(wrapper.text()).not.toContain('旧日期消息')

    wrapper.unmount()
  })
})
