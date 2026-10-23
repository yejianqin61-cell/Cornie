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

  it('keeps confirmation and tool results on the transient assistant message', async () => {
    let finishStream
    let resolveRefresh
    refresh.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve
      })
    )
    api.sendMessageStreamed.mockImplementation(
      (_request, _delta, onDone) =>
        new Promise((resolve) => {
          finishStream = () => {
            onDone({
              pendingConfirmation: { id: 'confirm-1', status: 'pending', confirmRequest: { reason: '需要确认' } },
              toolExecution: { results: [{ tool_name: 'ledger.create_entry', ok: true, result: { id: 1 } }] },
            })
            resolve()
          }
        })
    )
    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.find('textarea').setValue('记一笔')
    await wrapper.find('.chat-panel-send').trigger('click')
    await flushPromises()
    finishStream()
    await flushPromises()

    const transient = wrapper.findComponent(ChatHistoryPage).props('transientMessages')
    expect(transient[1].confirm.id).toBe('confirm-1')
    expect(transient[1].toolResults).toHaveLength(1)

    resolveRefresh()
    await flushPromises()
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

function dispatchEnter(element, options = {}) {
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options })
  element.dispatchEvent(event)
  return event
}

describe('ChatPanel date navigation', () => {
  const entries = [{ date: '2026-10-23' }, { date: '2026-10-22' }, { date: '2026-09-15' }, { date: '2025-12-31' }]

  beforeEach(() => {
    api.listChatDays.mockReset().mockImplementation((args = {}) => {
      const filtered = args.month ? entries.filter((entry) => entry.date.startsWith(args.month)) : entries
      return Promise.resolve({ entries: filtered, availableMonths: ['2025-12', '2026-09', '2026-10'] })
    })
  })

  it('labels days relative to today and with absolute dates', async () => {
    const wrapper = mountWithRealDateNav()
    await flushPromises()

    expect(wrapper.findAll('.chat-date-nav-item').map((item) => item.text())).toEqual([
      '2025年12月31日',
      '9月15日',
      '昨天',
      '今天',
    ])
  })

  it('filters by month and omits today outside the current month', async () => {
    const wrapper = mountWithRealDateNav()
    await flushPromises()

    await wrapper.find('.chat-date-nav-month').setValue('2026-09')
    await flushPromises()

    expect(api.listChatDays).toHaveBeenLastCalledWith({ month: '2026-09' })
    expect(wrapper.findAll('.chat-date-nav-item').map((item) => item.text())).toEqual(['9月15日'])
  })

  it('returns to today from an older day and clears the month filter', async () => {
    const wrapper = mountWithRealDateNav()
    await flushPromises()

    await wrapper.findAll('.chat-date-nav-item')[0].trigger('click')
    await wrapper.find('[aria-label="回到今天"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.chat-date-nav-item--active').text()).toBe('今天')
    expect(api.listChatDays).toHaveBeenLastCalledWith({})
  })
})

describe('ChatPanel composer', () => {
  beforeEach(() => {
    api.listChatDays.mockReset().mockResolvedValue({ entries: [{ date: '2026-10-23' }] })
    api.sendMessageStreamed.mockReset()
    refresh.mockReset()
  })

  it('does not send while an IME composition confirms with Enter', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('你好')

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    Object.defineProperty(event, 'isComposing', { value: true })
    textarea.element.dispatchEvent(event)
    await flushPromises()

    expect(api.sendMessageStreamed).not.toHaveBeenCalled()
  })

  it('does not send on Shift+Enter', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.find('textarea').setValue('多行草稿')

    dispatchEnter(wrapper.find('textarea').element, { shiftKey: true })
    await flushPromises()

    expect(api.sendMessageStreamed).not.toHaveBeenCalled()
  })

  it('sends on plain Enter and keeps the textarea editable during the request', async () => {
    api.sendMessageStreamed.mockImplementation(() => new Promise(() => {}))
    const wrapper = mountPanel()
    await flushPromises()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('按回车发送')

    dispatchEnter(textarea.element)
    await flushPromises()

    expect(api.sendMessageStreamed).toHaveBeenCalledOnce()
    expect(textarea.element.disabled).toBe(false)
  })

  it('caps the message at 5000 characters and explains the limit', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('maxlength')).toBe('5000')

    await textarea.setValue('x'.repeat(5001))
    dispatchEnter(textarea.element)
    await flushPromises()

    expect(api.sendMessageStreamed).not.toHaveBeenCalled()
    expect(wrapper.find('.chat-panel-error').text()).toContain('5000')
  })
})

describe('ChatPanel default date', () => {
  beforeEach(() => {
    api.listChatDays.mockReset().mockResolvedValue({
      entries: [{ date: '2026-10-23' }, { date: '2026-10-22' }, { date: '2026-10-21' }],
    })
  })

  it('opens today and lists days in ascending order', async () => {
    const wrapper = mountWithRealDateNav()
    await flushPromises()

    expect(wrapper.findAll('.chat-date-nav-item').map((item) => item.text())).toEqual(['10月21日', '昨天', '今天'])
    expect(wrapper.find('.chat-date-nav-item--active').text()).toBe('今天')
    expect(wrapper.findComponent(ChatHistoryPage).props('date')).toBe('2026-10-23')
  })

  it('adds today when the day list has no entry for today', async () => {
    api.listChatDays.mockResolvedValue({ entries: [{ date: '2026-10-22' }] })
    const wrapper = mountWithRealDateNav()
    await flushPromises()

    expect(wrapper.findAll('.chat-date-nav-item').map((item) => item.text())).toEqual(['昨天', '今天'])
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
