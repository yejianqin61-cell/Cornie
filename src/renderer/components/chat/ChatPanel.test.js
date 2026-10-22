import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const api = vi.hoisted(() => ({
  listChatDays: vi.fn(),
  sendMessage: vi.fn(),
  sendMessageStreamed: vi.fn(),
}))

vi.mock('../../api/chatlog.js', () => ({ listChatDays: api.listChatDays }))
vi.mock('../../api/conversation.js', () => ({
  sendMessage: api.sendMessage,
  sendMessageStreamed: api.sendMessageStreamed,
}))

import ChatPanel from './ChatPanel.vue'

const refresh = vi.fn()
const ChatHistoryPage = defineComponent({
  name: 'ChatHistoryPage',
  props: { date: String, transientMessages: Array },
  setup(_, { expose }) {
    expose({ refresh })
    return () => null
  },
})

function mountPanel() {
  return mount(ChatPanel, {
    global: {
      stubs: {
        ChatDateNav: true,
        ChatHistoryPage,
      },
    },
  })
}

describe('ChatPanel streaming send', () => {
  beforeEach(() => {
    api.listChatDays.mockReset().mockResolvedValue({ entries: [{ date: '2026-10-22' }] })
    api.sendMessage.mockReset()
    api.sendMessageStreamed.mockReset()
    refresh.mockReset()
  })

  it('streams an assistant reply then refreshes persisted history', async () => {
    let finishStream
    api.sendMessageStreamed.mockImplementation((_request, onDelta, onDone) => {
      onDelta('你')
      return new Promise((resolve) => {
        finishStream = () => {
          onDelta('好')
          onDone({})
          resolve()
        }
      })
    })
    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.find('textarea').setValue('你好')
    await wrapper.find('.chat-panel-send').trigger('click')
    await flushPromises()

    expect(api.sendMessageStreamed).toHaveBeenCalledWith(
      { message: '你好', date: '2026-10-22' },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(wrapper.findComponent(ChatHistoryPage).props('transientMessages')).toEqual([
      expect.objectContaining({ role: 'user', text: '你好' }),
      expect.objectContaining({ role: 'assistant', text: '你' }),
    ])

    finishStream()
    await flushPromises()
    expect(refresh).toHaveBeenCalledOnce()
    expect(wrapper.findComponent(ChatHistoryPage).props('transientMessages')).toEqual([])
  })

  it('cancels the active stream and restores the draft for retry', async () => {
    api.sendMessageStreamed.mockImplementation((_request, _delta, _done, _error, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      })
    )
    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.find('textarea').setValue('稍等')
    await wrapper.find('.chat-panel-send').trigger('click')
    await wrapper.find('.chat-panel-cancel').trigger('click')
    await flushPromises()

    expect(wrapper.find('textarea').element.value).toBe('稍等')
    expect(wrapper.find('.chat-panel-error').exists()).toBe(false)
  })
})
