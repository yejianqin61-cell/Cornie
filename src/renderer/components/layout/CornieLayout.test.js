import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CornieLayout from './CornieLayout.vue'

describe('CornieLayout', () => {
  it('exposes the main content as a main landmark', () => {
    const wrapper = mount(CornieLayout, {
      slots: { default: '内容', sidebar: '侧栏', status: '状态' },
    })

    expect(wrapper.find('main.nb-layout-main').exists()).toBe(true)
    expect(wrapper.find('main').text()).toContain('内容')
  })
})
