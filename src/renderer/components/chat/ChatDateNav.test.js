import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatDateNav from './ChatDateNav.vue'

function mountNav() {
  return mount(ChatDateNav, { props: { days: [{ date: '2026-10-23', label: '今天' }], selected: '2026-10-23' } })
}

function searchButton(wrapper) {
  return wrapper.findAll('button').find((button) => button.text() === '搜索')
}

describe('ChatDateNav search', () => {
  it('emits search with the trimmed keyword on Enter', async () => {
    const wrapper = mountNav()
    const input = wrapper.get('input[aria-label="搜索聊天记录"]')
    await input.setValue(' 咖啡 ')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('search')[0]).toEqual(['咖啡'])
  })

  it('emits search from the search button', async () => {
    const wrapper = mountNav()
    await wrapper.get('input[aria-label="搜索聊天记录"]').setValue('咖啡')
    await searchButton(wrapper).trigger('click')
    expect(wrapper.emitted('search')[0]).toEqual(['咖啡'])
  })

  it('does not emit search for an empty keyword', async () => {
    const wrapper = mountNav()
    await searchButton(wrapper).trigger('click')
    expect(wrapper.emitted('search')).toBeUndefined()
  })
})
