import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsSection from './SettingsSection.vue'
import AboutSection from './AboutSection.vue'
import ModelSettings from './ModelSettings.vue'

describe('SettingsSection', () => {
  it('renders title and slot content', () => {
    const wrapper = mount(SettingsSection, {
      props: { title: '测试', description: '说明' },
      slots: { default: '<span>内容</span>' },
    })
    expect(wrapper.text()).toContain('测试')
    expect(wrapper.text()).toContain('说明')
    expect(wrapper.text()).toContain('内容')
  })
})

describe('AboutSection', () => {
  it('renders version and framework info', () => {
    const wrapper = mount(AboutSection)
    expect(wrapper.text()).toContain('v0.1.0')
    expect(wrapper.text()).toContain('Electron')
  })
})

describe('ModelSettings', () => {
  it('renders form fields initially with skeleton', () => {
    const wrapper = mount(ModelSettings, {
      global: {
        stubs: { SettingsSection: { template: '<div><slot /></div>' } },
      },
    })
    expect(wrapper.find('.model-fields').exists() || wrapper.find('.model-skeleton').exists()).toBe(true)
  })

  it('shows save text on button', () => {
    const wrapper = mount(ModelSettings, {
      global: {
        stubs: { SettingsSection: { template: '<div><slot /></div>' } },
      },
    })
    const btns = wrapper.findAllComponents({ name: 'Button' })
    const saveBtn = btns.find(b => b.text().includes('保存'))
    expect(saveBtn).toBeTruthy()
  })
})