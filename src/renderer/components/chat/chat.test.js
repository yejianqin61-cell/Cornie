import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import MessageRow from './MessageRow.vue'
import ToolResultPanel from './ToolResultPanel.vue'
import ConfirmCard from './ConfirmCard.vue'
import ChatDateNav from './ChatDateNav.vue'

describe('MessageRow', () => {
  it('renders user message', () => {
    const wrapper = mount(MessageRow, {
      props: { message: { id: '1', role: 'user', text: '你好' } },
    })
    expect(wrapper.text()).toContain('你好')
    expect(wrapper.text()).toContain('我')
  })

  it('renders assistant message', () => {
    const wrapper = mount(MessageRow, {
      props: { message: { id: '2', role: 'assistant', text: '你好！' } },
    })
    expect(wrapper.text()).toContain('你好！')
    expect(wrapper.text()).toContain('Cornie')
  })

  it('renders system message', () => {
    const wrapper = mount(MessageRow, {
      props: { message: { id: '3', role: 'system', text: '已连接' } },
    })
    expect(wrapper.text()).toContain('已连接')
    expect(wrapper.text()).toContain('系统')
  })
})

describe('ToolResultPanel', () => {
  it('renders tool results using the backend shape', () => {
    const wrapper = mount(ToolResultPanel, {
      props: { results: [{ tool_name: 'ledger.create_entry', ok: true, result: { id: 1, amount: 12 } }] },
    })
    expect(wrapper.text()).toContain('ledger.create_entry')
    expect(wrapper.text()).toContain('"amount": 12')
  })

  it('renders failed tool result error message', () => {
    const wrapper = mount(ToolResultPanel, {
      props: { results: [{ tool_name: 'diary', ok: false, error: { code: 'write_failed', message: '写入失败' } }] },
    })
    expect(wrapper.text()).toContain('写入失败')
  })

  it('renders nothing with empty results', () => {
    const wrapper = mount(ToolResultPanel, {
      props: { results: [] },
    })
    expect(wrapper.html()).not.toContain('tool-result')
  })
})

describe('ConfirmCard', () => {
  it('renders the backend reason', () => {
    const wrapper = mount(ConfirmCard, {
      props: {
        confirm: {
          id: 'c1',
          status: 'pending',
          confirmRequest: { reason: '确认删除？', toolName: 'ledger.delete_entry' },
        },
      },
    })
    expect(wrapper.text()).toContain('确认删除？')
    expect(wrapper.text()).toContain('ledger.delete_entry')
    expect(wrapper.text()).toContain('确认')
    expect(wrapper.text()).toContain('拒绝')
  })
})

describe('ChatDateNav', () => {
  const days = [
    { date: '2026-09-15', label: '09-15' },
    { date: '2026-09-16', label: '今天' },
  ]

  it('renders day buttons', () => {
    const wrapper = mount(ChatDateNav, {
      props: { days, selected: '2026-09-16' },
    })
    expect(wrapper.text()).toContain('09-15')
    expect(wrapper.text()).toContain('今天')
    expect(wrapper.findAll('div.neobrutalism-button')).toHaveLength(0)
    expect(wrapper.findAll('button')).toHaveLength(4)
  })

  it('emits select on click', async () => {
    const wrapper = mount(ChatDateNav, {
      props: { days, selected: '2026-09-16' },
    })
    const btns = wrapper.findAll('.chat-date-nav-item')
    await btns[0].trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0][0]).toBe('2026-09-15')
  })

  it('scrolls the selected day into view', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    mount(ChatDateNav, { props: { days, selected: '2026-09-16' } })
    await nextTick()

    expect(scrollIntoView).toHaveBeenCalled()
    delete Element.prototype.scrollIntoView
  })
})
