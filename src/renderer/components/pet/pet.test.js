import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CornieBubble from './CornieBubble.vue'
import PetSettings from './PetSettings.vue'

describe('CornieBubble', () => {
  it('renders bubble text', () => {
    const wrapper = mount(CornieBubble, {
      props: { text: '该喝水了' },
    })
    expect(wrapper.text()).toContain('该喝水了')
  })

  it('has bubble class', () => {
    const wrapper = mount(CornieBubble, {
      props: { text: '测试' },
    })
    expect(wrapper.find('.cornie-bubble').exists()).toBe(true)
  })
})

describe('PetSettings', () => {
  it('renders scale options', () => {
    const wrapper = mount(PetSettings, {
      props: { scale: 1, alwaysOnTop: false },
    })
    expect(wrapper.text()).toContain('大小')
    expect(wrapper.text()).toContain('置顶')
  })

  it('highlights active scale', () => {
    const wrapper = mount(PetSettings, {
      props: { scale: 0.8, alwaysOnTop: false },
    })
    const scales = wrapper.findAll('.pet-settings-scale')
    const active = scales.find(s => s.classes().includes('active'))
    expect(active.text()).toBe('0.8x')
  })

  it('emits scale-change on click', async () => {
    const wrapper = mount(PetSettings, {
      props: { scale: 1, alwaysOnTop: false },
    })
    await wrapper.findAll('.pet-settings-scale')[0].trigger('click')
    expect(wrapper.emitted('scale-change')).toBeTruthy()
  })

  it('emits toggle-always-on-top', async () => {
    const wrapper = mount(PetSettings, {
      props: { scale: 1, alwaysOnTop: false },
    })
    await wrapper.find('.pet-settings-toggle-btn').trigger('click')
    expect(wrapper.emitted('toggle-always-on-top')).toBeTruthy()
  })

  it('toggles shows correct state', () => {
    const wrapper = mount(PetSettings, {
      props: { scale: 1, alwaysOnTop: true },
    })
    expect(wrapper.find('.pet-settings-toggle-btn.on').exists()).toBe(true)
  })
})