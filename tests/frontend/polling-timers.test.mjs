import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'

vi.mock('../../src/renderer/api', () => ({
  getConversation: vi.fn(),
  listConfirmations: vi.fn(),
  sendMessage: vi.fn(),
  streamConversation: vi.fn(),
  submitConfirmationDecision: vi.fn(),
  createObservation: vi.fn(),
  deleteObservation: vi.fn(),
  listObservations: vi.fn()
}))

import * as api from '../../src/renderer/api'
import { useChat } from '../../src/renderer/composables/useChat'
import { useDebouncedValue } from '../../src/renderer/composables/useTimers'
import ObservationList from '../../src/renderer/components/ObservationList.vue'

beforeEach(() => {
  vi.clearAllMocks()
  api.getConversation.mockResolvedValue({ messages: [] })
  api.listConfirmations.mockResolvedValue({ confirmations: [] })
  api.listObservations.mockResolvedValue({ observations: [], items: [] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('FE-04 轮询防重入', () => {
  it('慢响应期间定时器到点不再并发发起同步', async () => {
    vi.useFakeTimers()
    let resolveConv
    api.getConversation.mockImplementation(
      () => new Promise((r) => { resolveConv = r })
    )

    const chat = useChat()
    chat.startConversationSync('2026-08-21', { intervalMs: 1000 })
    await Promise.resolve()

    // 第一轮已发起（start 时立即 runSync）
    expect(api.getConversation).toHaveBeenCalledTimes(1)

    // 推进 2 个周期：仍在途 → 防重入跳过
    await vi.advanceTimersByTimeAsync(2000)
    expect(api.getConversation).toHaveBeenCalledTimes(1)

    // 完成后下一轮可发起
    resolveConv({ messages: [] })
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.getConversation).toHaveBeenCalledTimes(2)

    chat.stopConversationSync()
  })

  it('恢复可见时立即补一次同步', async () => {
    vi.useFakeTimers()
    const chat = useChat()
    chat.startConversationSync('2026-08-21', { intervalMs: 60000 })
    await vi.advanceTimersByTimeAsync(0)

    const before = api.getConversation.mock.calls.length
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()

    expect(api.getConversation.mock.calls.length).toBe(before + 1)
    chat.stopConversationSync()
  })

  it('stopConversationSync 移除可见性监听', async () => {
    vi.useFakeTimers()
    const chat = useChat()
    chat.startConversationSync('2026-08-21', { intervalMs: 60000 })
    chat.stopConversationSync()

    const before = api.getConversation.mock.calls.length
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(api.getConversation.mock.calls.length).toBe(before)
  })
})

describe('FE-04 定时器工具', () => {
  it('useDebouncedValue 卸载后不再触发回调', async () => {
    vi.useFakeTimers()
    const Comp = defineComponent({
      template: '<div/>',
      setup() {
        const keyword = ref('')
        useDebouncedValue(keyword, 220, () => {
          api.listObservations()
        })
        return { keyword }
      }
    })

    const wrapper = mount(Comp)
    wrapper.vm.keyword = '猫'
    await vi.advanceTimersByTimeAsync(300)
    expect(api.listObservations).toHaveBeenCalledTimes(1)

    // 再次触发后立即卸载：回调不应再触发
    wrapper.vm.keyword = '狗'
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.listObservations).toHaveBeenCalledTimes(1)
  })

  it('ObservationList 搜索防抖在卸载后不再触发请求', async () => {
    vi.useFakeTimers()
    const wrapper = mount(ObservationList)
    await flushPromises()

    // 搜索框在"回翻以前"（history tab）内，先切换
    const historyTab = wrapper.findAll('button').find((b) => b.text() === '回翻以前')
    await historyTab.trigger('click')
    await flushPromises()

    const input = wrapper.find('input[placeholder*="龙虾"]')
    expect(input.exists()).toBe(true)
    await input.setValue('猫')
    await vi.advanceTimersByTimeAsync(300)
    const callsWithDebounce = api.listObservations.mock.calls.length

    await input.setValue('狗')
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.listObservations.mock.calls.length).toBe(callsWithDebounce)
  })
})
