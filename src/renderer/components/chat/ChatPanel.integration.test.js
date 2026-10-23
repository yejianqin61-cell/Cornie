import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const chatlog = vi.hoisted(() => ({ listChatDays: vi.fn(), getChatDay: vi.fn(), exportChatDay: vi.fn() }))
const conversation = vi.hoisted(() => ({ sendMessage: vi.fn(), sendMessageStreamed: vi.fn() }))
const confirmApi = vi.hoisted(() => ({ listConfirmations: vi.fn(), confirmAction: vi.fn() }))
vi.mock('../../api/chatlog.js', () => chatlog)
vi.mock('../../api/conversation.js', () => conversation)
vi.mock('../../api/confirm.js', () => confirmApi)
vi.mock('../../../../shared/local-date.js', () => ({ singaporeDate: () => '2026-10-23' }))

import ChatPanel from './ChatPanel.vue'

describe('ChatPanel with real history children', () => {
  beforeEach(() => {
    chatlog.listChatDays.mockReset().mockResolvedValue({ entries: [{ date: '2026-10-23' }] })
    chatlog.getChatDay
      .mockReset()
      .mockResolvedValueOnce({ messages: [], pagination: { hasMore: false, nextCursor: null } })
      .mockResolvedValue({
        messages: [
          { id: 'm1', role: 'user', text: '你好', createdAt: 1 },
          { id: 'm2', role: 'cornie', text: '你好呀', createdAt: 2 },
        ],
        pagination: { hasMore: false, nextCursor: null },
      })
    chatlog.exportChatDay.mockReset()
    confirmApi.listConfirmations.mockReset().mockResolvedValue({ confirmations: [] })
    conversation.sendMessage.mockReset()
    conversation.sendMessageStreamed.mockReset().mockImplementation((_request, onDelta, onDone) => {
      onDelta('你好')
      onDelta('呀')
      onDone({})
      return Promise.resolve()
    })
  })

  it('renders the reply through the real date and history components', async () => {
    const wrapper = mount(ChatPanel)
    await flushPromises()

    await wrapper.find('textarea').setValue('在吗')
    await wrapper.find('.chat-panel-send').trigger('click')
    await flushPromises()

    const rows = wrapper.findAll('.msg-row')
    expect(rows).toHaveLength(2)
    expect(wrapper.text()).toContain('你好呀')
    expect(wrapper.find('.chat-date-nav-item--active').text()).toBe('今天')
  })
})
