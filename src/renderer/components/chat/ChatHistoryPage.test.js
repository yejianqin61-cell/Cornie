import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const api = vi.hoisted(() => ({ getChatDay: vi.fn() }))
const confirmApi = vi.hoisted(() => ({ listConfirmations: vi.fn() }))
vi.mock('../../api/chatlog.js', () => ({ getChatDay: api.getChatDay }))
vi.mock('../../api/confirm.js', () => ({ listConfirmations: confirmApi.listConfirmations }))

import ChatHistoryPage from './ChatHistoryPage.vue'

describe('ChatHistoryPage transient visibility', () => {
  beforeEach(() => {
    api.getChatDay.mockReset().mockResolvedValue({ messages: [] })
    confirmApi.listConfirmations.mockReset().mockResolvedValue({ confirmations: [] })
  })

  it('renders transient messages while persisted history is empty', async () => {
    const wrapper = mount(ChatHistoryPage, {
      props: {
        date: '2026-10-23',
        transientMessages: [
          { id: 'pending-user', role: 'user', text: '第一次说话' },
          { id: 'pending-assistant', role: 'assistant', text: '我在呢' },
        ],
      },
    })
    await flushPromises()

    expect(wrapper.findAll('.msg-row')).toHaveLength(2)
    expect(wrapper.find('.empty-state').exists()).toBe(false)
  })

  it('shows the empty state only when both history and transient are empty', async () => {
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()

    expect(wrapper.findAll('.msg-row')).toHaveLength(0)
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('loads every page and keeps the newest message', async () => {
    api.getChatDay
      .mockResolvedValueOnce({
        messages: [{ id: 'm1', role: 'user', text: '旧消息' }],
        pagination: { hasMore: true, nextCursor: '1' },
      })
      .mockResolvedValueOnce({
        messages: [{ id: 'm2', role: 'cornie', text: '新消息' }],
        pagination: { hasMore: false, nextCursor: null },
      })
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()

    expect(api.getChatDay).toHaveBeenCalledTimes(2)
    expect(api.getChatDay).toHaveBeenNthCalledWith(1, '2026-10-23', { cursor: undefined, limit: 100 })
    expect(api.getChatDay).toHaveBeenNthCalledWith(2, '2026-10-23', { cursor: '1', limit: 100 })
    expect(wrapper.findAll('.msg-row')).toHaveLength(2)
    expect(wrapper.text()).toContain('新消息')
  })

  it('stops at the page cap instead of looping forever', async () => {
    api.getChatDay.mockResolvedValue({
      messages: [{ id: 'm', role: 'user', text: '分页' }],
      pagination: { hasMore: true, nextCursor: '1' },
    })
    mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()

    expect(api.getChatDay).toHaveBeenCalledTimes(20)
  })

  it('scrolls the history container to the bottom after loading', async () => {
    api.getChatDay.mockResolvedValue({ messages: [], pagination: { hasMore: false, nextCursor: null } })
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()

    const container = wrapper.find('.chat-history').element
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 720 })
    await wrapper.vm.refresh()

    expect(container.scrollTop).toBe(720)
  })

  it('attaches a pending confirmation to its conversation message', async () => {
    api.getChatDay.mockResolvedValue({
      messages: [{ id: 'm1', role: 'cornie', text: '需要你确认', createdAt: 1 }],
      pagination: { hasMore: false, nextCursor: null },
    })
    confirmApi.listConfirmations.mockResolvedValue({
      confirmations: [
        {
          id: 'confirm-1',
          conversationMessageId: 'm1',
          status: 'pending',
          confirmRequest: { reason: '确认记账', toolName: 'ledger.create_entry' },
        },
      ],
    })
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()

    expect(confirmApi.listConfirmations).toHaveBeenCalledWith('2026-10-23')
    expect(wrapper.text()).toContain('确认记账')
    expect(wrapper.findComponent({ name: 'ConfirmCard' }).exists()).toBe(true)
  })
})

function setScrollMetrics(element, { scrollHeight, clientHeight = 100 }) {
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: clientHeight })
}

describe('ChatHistoryPage scrolling', () => {
  beforeEach(() => {
    api.getChatDay.mockReset().mockResolvedValue({
      messages: [{ id: 'm1', role: 'user', text: '历史消息', createdAt: 1 }],
      pagination: { hasMore: false, nextCursor: null },
    })
    confirmApi.listConfirmations.mockReset().mockResolvedValue({ confirmations: [] })
  })

  it('follows new transient messages while the reader is at the bottom', async () => {
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()
    const container = wrapper.find('.chat-history').element
    setScrollMetrics(container, { scrollHeight: 1000 })
    container.scrollTop = 900
    container.dispatchEvent(new Event('scroll'))

    await wrapper.setProps({ transientMessages: [{ id: 't1', role: 'user', text: '新消息' }] })
    await flushPromises()

    expect(container.scrollTop).toBe(1000)
  })

  it('stops following after the reader scrolls up and offers a jump back', async () => {
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()
    const container = wrapper.find('.chat-history').element
    setScrollMetrics(container, { scrollHeight: 1000 })
    container.scrollTop = 0
    container.dispatchEvent(new Event('scroll'))

    await wrapper.setProps({ transientMessages: [{ id: 't1', role: 'user', text: '新消息' }] })
    await flushPromises()

    expect(container.scrollTop).toBe(0)
    const jump = wrapper.find('.chat-history-jump')
    expect(jump.exists()).toBe(true)
    await jump.trigger('click')
    expect(container.scrollTop).toBe(1000)
  })

  it('restores the scroll position per day when switching back', async () => {
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()
    const container = wrapper.find('.chat-history').element
    setScrollMetrics(container, { scrollHeight: 1000 })
    container.scrollTop = 300
    container.dispatchEvent(new Event('scroll'))

    await wrapper.setProps({ date: '2026-10-22' })
    await flushPromises()
    container.scrollTop = 500
    container.dispatchEvent(new Event('scroll'))

    await wrapper.setProps({ date: '2026-10-23' })
    await flushPromises()

    expect(container.scrollTop).toBe(300)
  })
})
