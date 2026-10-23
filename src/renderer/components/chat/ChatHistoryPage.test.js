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
})
