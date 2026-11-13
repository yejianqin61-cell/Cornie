import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const api = vi.hoisted(() => ({
  getModelSettings: vi.fn(),
  saveModelSettings: vi.fn(),
  clearModelSettings: vi.fn(),
  getDiaryAutoSetting: vi.fn(),
  saveDiaryAutoSetting: vi.fn(),
}))
vi.mock('../../api/settings.js', () => api)

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
    const saveBtn = btns.find((b) => b.text().includes('保存'))
    expect(saveBtn).toBeTruthy()
  })
})

describe('ModelSettings typing', () => {
  it('saves what the user typed into the key field', async () => {
    api.getModelSettings.mockResolvedValue({ settings: {} })
    api.saveModelSettings.mockResolvedValue({ settings: {} })
    const wrapper = mount(ModelSettings, {
      global: { stubs: { SettingsSection: { template: '<div><slot /></div>' } } },
    })
    await flushPromises()

    await wrapper.get('input[type="password"]').setValue('sk-typed-key')
    const saveBtn = wrapper.findAllComponents({ name: 'Button' }).find((b) => b.text().includes('保存'))
    await saveBtn.trigger('click')
    await flushPromises()

    expect(api.saveModelSettings).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'sk-typed-key' }))
  })
})

describe('DiarySettings', () => {
  it('saves the auto diary choice', async () => {
    const { getDiaryAutoSetting, saveDiaryAutoSetting } = api
    getDiaryAutoSetting.mockResolvedValue({ settings: { enabled: false } })
    saveDiaryAutoSetting.mockResolvedValue({ settings: { enabled: true } })
    const { default: DiarySettings } = await import('./DiarySettings.vue')
    const wrapper = mount(DiarySettings)
    await flushPromises()
    expect(wrapper.text()).toContain('自动生成 Cornie 日记（会调用模型）')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(saveDiaryAutoSetting).toHaveBeenCalledTimes(1)
    expect(saveDiaryAutoSetting).toHaveBeenCalledWith(true)
  })
})
