import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const api = vi.hoisted(() => ({ getChatDay: vi.fn() }))
vi.mock('../../api/chatlog.js', () => ({ getChatDay: api.getChatDay }))

import ChatHistoryPage from './ChatHistoryPage.vue'

describe('ChatHistoryPage transient visibility', () => {
  beforeEach(() => {
    api.getChatDay.mockReset().mockResolvedValue({ messages: [] })
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
})
