import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const api = vi.hoisted(() => ({ confirmAction: vi.fn() }))
vi.mock('../../api/confirm.js', () => ({ confirmAction: api.confirmAction }))

import ConfirmCard from './ConfirmCard.vue'

const backendConfirm = (overrides = {}) => ({
  id: 'confirm-1',
  status: 'pending',
  conversationMessageId: 'message-1',
  confirmRequest: {
    kind: 'tool_confirmation',
    toolName: 'ledger.create_entry',
    reason: '需要确认是否记这笔账',
    arguments: { amount: 12, category: '餐饮' },
  },
  ...overrides,
})

describe('ConfirmCard', () => {
  it('renders the backend reason, tool name and arguments', () => {
    const wrapper = mount(ConfirmCard, { props: { confirm: backendConfirm() } })

    expect(wrapper.text()).toContain('需要确认是否记这笔账')
    expect(wrapper.text()).toContain('ledger.create_entry')
    expect(wrapper.text()).toContain('"amount": 12')
  })

  it('submits the approved decision once and keeps the resolved card locked', async () => {
    let finish
    api.confirmAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ confirmation: { status: 'executed' } })
        })
    )
    const wrapper = mount(ConfirmCard, { props: { confirm: backendConfirm() } })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(api.confirmAction).toHaveBeenCalledWith('confirm-1', 'approve')
    expect(buttons[0].element.disabled).toBe(true)
    expect(buttons[1].element.disabled).toBe(true)

    finish()
    await flushPromises()
    expect(wrapper.text()).toContain('已执行')
    await buttons[0].trigger('click')
    expect(api.confirmAction).toHaveBeenCalledTimes(1)
  })

  it('submits rejection using the backend decision vocabulary', async () => {
    api.confirmAction.mockResolvedValue({ confirmation: { status: 'rejected' } })
    const wrapper = mount(ConfirmCard, { props: { confirm: backendConfirm({ id: 'confirm-2' }) } })

    await wrapper.findAll('button')[1].trigger('click')
    expect(api.confirmAction).toHaveBeenCalledWith('confirm-2', 'reject')
    await flushPromises()
    expect(wrapper.text()).toContain('已拒绝')
  })

  it('explains a failed decision and allows another attempt', async () => {
    api.confirmAction.mockRejectedValue(new Error('执行失败：类目不存在'))
    const wrapper = mount(ConfirmCard, { props: { confirm: backendConfirm() } })

    await wrapper.findAll('button')[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('执行失败：类目不存在')
    expect(wrapper.findAll('button')[0].element.disabled).toBe(false)
  })
})
