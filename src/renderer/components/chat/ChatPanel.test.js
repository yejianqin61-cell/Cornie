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
vi.mock('../../../../shared/local-date.js', () => ({ singaporeDate: () => '2026-10-23' }))

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
    api.listChatDays.mockReset().mockResolvedValue({
      entries: [{ date: '2026-10-23' }, { date: '2026-10-22' }, { date: '2026-10-21' }],
    })
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
      { message: '你好', date: '2026-10-23' },
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
    expect(api.listChatDays).toHaveBeenCalledTimes(2)
    expect(api.listChatDays.mock.invocationCallOrder[1]).toBeLessThan(refresh.mock.invocationCallOrder[0])
    expect(wrapper.findComponent(ChatHistoryPage).props('transientMessages')).toEqual([])
  })

  it('cancels the active stream and restores the draft for retry', async () => {
    api.sendMessageStreamed.mockImplementation(
      (_request, _delta, _done, _error, { signal }) =>
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

function mountWithRealDateNav() {
  return mount(ChatPanel, { global: { stubs: { ChatHistoryPage } } })
}

describe('ChatPanel default date', () => {
  beforeEach(() => {
    api.listChatDays.mockReset().mockResolvedValue({
      entries: [{ date: '2026-10-23' }, { date: '2026-10-22' }, { date: '2026-10-21' }],
    })
  })

  it('opens today and lists days in ascending order', async () => {
    const wrapper = mountWithRealDateNav()
    await flushPromises()

    expect(wrapper.findAll('.chat-date-nav-item').map((item) => item.text())).toEqual(['10-21', '10-22', '今天'])
    expect(wrapper.find('.chat-date-nav-item--active').text()).toBe('今天')
    expect(wrapper.findComponent(ChatHistoryPage).props('date')).toBe('2026-10-23')
  })

  it('adds today when the day list has no entry for today', async () => {
    api.listChatDays.mockResolvedValue({ entries: [{ date: '2026-10-22' }] })
    const wrapper = mountWithRealDateNav()
    await flushPromises()

    expect(wrapper.findAll('.chat-date-nav-item').map((item) => item.text())).toEqual(['10-22', '今天'])
    expect(wrapper.find('.chat-date-nav-item--active').text()).toBe('今天')
  })

  it('disables the arrows at both ends of the range', async () => {
    const wrapper = mountWithRealDateNav()
    await flushPromises()

    let arrows = wrapper.findAll('.chat-date-nav > button')
    expect(arrows).toHaveLength(2)
    expect(arrows[0].attributes('disabled')).toBeUndefined()
    expect(arrows[1].attributes('disabled')).toBeDefined()

    await wrapper.findAll('.chat-date-nav-item')[0].trigger('click')

    arrows = wrapper.findAll('.chat-date-nav > button')
    expect(arrows[0].attributes('disabled')).toBeDefined()
    expect(arrows[1].attributes('disabled')).toBeUndefined()
  })
})
