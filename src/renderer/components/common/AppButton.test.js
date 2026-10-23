import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppButton from './AppButton.vue'

describe('AppButton', () => {
  it('renders a native button element', () => {
    const wrapper = mount(AppButton, { slots: { default: '确认' } })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.text()).toContain('确认')
  })

  it('disables the native button', () => {
    const wrapper = mount(AppButton, { props: { disabled: true } })
    expect(wrapper.element.disabled).toBe(true)
  })

  it('forwards native click listeners', async () => {
    const onClick = vi.fn()
    const wrapper = mount(AppButton, { attrs: { onClick } })
    await wrapper.trigger('click')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('maps variant and size to neobrutalism classes', () => {
    const wrapper = mount(AppButton, { props: { variant: 'outline', size: 'icon' } })
    expect(wrapper.classes()).toContain('neobrutalism-button-outline')
    expect(wrapper.classes()).toContain('app-button-icon')
  })
})
