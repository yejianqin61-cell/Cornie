import { describe, it, expect } from 'vitest'
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
  it('renders tool results', () => {
    const wrapper = mount(ToolResultPanel, {
      props: { results: [{ tool: 'ledger', success: true, data: 'OK' }] },
    })
    expect(wrapper.text()).toContain('ledger')
    expect(wrapper.text()).toContain('OK')
  })

  it('renders failed tool result', () => {
    const wrapper = mount(ToolResultPanel, {
      props: { results: [{ tool: 'diary', success: false, error: '失败' }] },
    })
    expect(wrapper.text()).toContain('失败')
  })

  it('renders nothing with empty results', () => {
    const wrapper = mount(ToolResultPanel, {
      props: { results: [] },
    })
    expect(wrapper.html()).not.toContain('tool-result')
  })
})

describe('ConfirmCard', () => {
  it('renders confirm message', () => {
    const wrapper = mount(ConfirmCard, {
      props: { confirm: { id: 'c1', message: '确认删除？' } },
    })
    expect(wrapper.text()).toContain('确认删除？')
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
})