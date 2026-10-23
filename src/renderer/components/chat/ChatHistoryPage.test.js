import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const api = vi.hoisted(() => ({ getChatDay: vi.fn(), exportChatDay: vi.fn() }))
const confirmApi = vi.hoisted(() => ({ listConfirmations: vi.fn() }))
vi.mock('../../api/chatlog.js', () => ({ getChatDay: api.getChatDay, exportChatDay: api.exportChatDay }))
vi.mock('../../api/confirm.js', () => ({ listConfirmations: confirmApi.listConfirmations }))

import ChatHistoryPage from './ChatHistoryPage.vue'

describe('ChatHistoryPage transient visibility', () => {
  beforeEach(() => {
    api.getChatDay.mockReset().mockResolvedValue({ messages: [] })
    api.exportChatDay.mockReset().mockResolvedValue({})
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

  it('ignores transient messages that belong to another day', async () => {
    const wrapper = mount(ChatHistoryPage, {
      props: {
        date: '2026-10-23',
        transientMessages: [{ id: 't1', role: 'user', text: '别的日期', date: '2026-10-22' }],
      },
    })
    await flushPromises()

    expect(wrapper.text()).not.toContain('别的日期')
    expect(wrapper.findAll('.msg-row')).toHaveLength(0)
  })

  it('reuses the shared error state and retries the load', async () => {
    api.getChatDay.mockRejectedValueOnce(new Error('加载失败'))
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'ErrorState' }).exists()).toBe(true)
    expect(wrapper.text()).toContain('加载失败')
    await wrapper.find('.error-retry').trigger('click')
    await flushPromises()
    expect(api.getChatDay).toHaveBeenCalledTimes(2)
  })

  it('distinguishes today from a past day with no messages', async () => {
    api.getChatDay.mockResolvedValue({ messages: [], pagination: { hasMore: false, nextCursor: null } })
    const today = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [], isToday: true } })
    await flushPromises()
    expect(today.text()).toContain('今天还没有聊天记录')

    const past = mount(ChatHistoryPage, { props: { date: '2026-10-22', transientMessages: [], isToday: false } })
    await flushPromises()
    expect(past.text()).toContain('这一天没有聊天记录')
  })

  it('marks the message list as a live log', async () => {
    api.getChatDay.mockResolvedValue({
      messages: [{ id: 'm1', role: 'user', text: '你好', createdAt: 1 }],
      pagination: { hasMore: false, nextCursor: null },
    })
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()

    const log = wrapper.find('.chat-history-messages')
    expect(log.attributes('role')).toBe('log')
    expect(log.attributes('aria-live')).toBe('polite')
  })

  it('announces the loading state', async () => {
    api.getChatDay.mockImplementation(() => new Promise(() => {}))
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('shows a day summary with the message count', async () => {
    api.getChatDay.mockResolvedValue({
      messages: [
        { id: 'm1', role: 'user', text: '一', createdAt: 1 },
        { id: 'm2', role: 'cornie', text: '二', createdAt: 2 },
        { id: 'm3', role: 'user', text: '三', createdAt: 3 },
      ],
      pagination: { hasMore: false, nextCursor: null },
    })
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()

    expect(wrapper.find('.chat-history-summary').text()).toContain('3 条消息')
  })

  it('downloads the day export with the server filename', async () => {
    const downloads = []
    URL.createObjectURL = vi.fn(() => 'blob:chatlog')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      downloads.push(this.download)
    })
    api.exportChatDay.mockResolvedValue({
      filename: 'chatlog-2026-10-23.json',
      content: '{"messages":[]}',
      contentType: 'application/json; charset=utf-8',
    })
    api.getChatDay.mockResolvedValue({
      messages: [{ id: 'm1', role: 'user', text: '一', createdAt: 1 }],
      pagination: { hasMore: false, nextCursor: null },
    })
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()

    await wrapper.find('.chat-history-export').trigger('click')
    await flushPromises()

    expect(api.exportChatDay).toHaveBeenCalledWith('2026-10-23')
    expect(downloads).toEqual(['chatlog-2026-10-23.json'])
    expect(URL.revokeObjectURL).toHaveBeenCalled()
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

describe('ChatHistoryPage request ordering', () => {
  beforeEach(() => {
    api.getChatDay.mockReset()
    confirmApi.listConfirmations.mockReset().mockResolvedValue({ confirmations: [] })
  })

  it('keeps the last requested day when an older load resolves later', async () => {
    let resolveFirst
    api.getChatDay
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          })
      )
      .mockResolvedValueOnce({
        messages: [{ id: 'new-one', role: 'user', text: '新日期', createdAt: 2 }],
        pagination: { hasMore: false, nextCursor: null },
      })
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })

    await wrapper.setProps({ date: '2026-10-22' })
    await flushPromises()
    resolveFirst({
      messages: [{ id: 'old-one', role: 'user', text: '旧日期', createdAt: 1 }],
      pagination: { hasMore: false, nextCursor: null },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('新日期')
    expect(wrapper.text()).not.toContain('旧日期')
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

  it('returns to the newest message when a refresh asks for the bottom', async () => {
    const wrapper = mount(ChatHistoryPage, { props: { date: '2026-10-23', transientMessages: [] } })
    await flushPromises()
    const container = wrapper.find('.chat-history').element
    setScrollMetrics(container, { scrollHeight: 1000 })
    container.scrollTop = 300
    container.dispatchEvent(new Event('scroll'))

    await wrapper.vm.refresh({ bottom: true })
    await flushPromises()

    expect(container.scrollTop).toBe(1000)
  })
})
