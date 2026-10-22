import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const api = vi.hoisted(() => ({ confirmAction: vi.fn() }))
vi.mock('../../api/confirm.js', () => ({ confirmAction: api.confirmAction }))

import ConfirmCard from './ConfirmCard.vue'

const Button = {
  name: 'Button',
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
}

describe('ConfirmCard', () => {
  it('submits the approved decision once and keeps the resolved card locked', async () => {
    let finish
    api.confirmAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ confirmation: { status: 'executed' } })
        })
    )
    const wrapper = mount(ConfirmCard, {
      props: { confirm: { id: 'confirm-1', message: '确认执行？' } },
      global: { stubs: { Button } },
    })

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
    const wrapper = mount(ConfirmCard, {
      props: { confirm: { id: 'confirm-2', message: '确认拒绝？' } },
      global: { stubs: { Button } },
    })

    await wrapper.findAll('button')[1].trigger('click')
    expect(api.confirmAction).toHaveBeenCalledWith('confirm-2', 'reject')
    await flushPromises()
    expect(wrapper.text()).toContain('已拒绝')
  })
})
