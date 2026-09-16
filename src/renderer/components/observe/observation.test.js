import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ObservationCard from './ObservationCard.vue'
import ObservationEmptyState from './ObservationEmptyState.vue'
import ObservationLinkedMemory from './ObservationLinkedMemory.vue'
import ObservationDeleteConfirm from './ObservationDeleteConfirm.vue'
import ObservationDetailPage from './ObservationDetailPage.vue'

describe('ObservationCard', () => {
  it('renders date, type, title, and truncated content', () => {
    const wrapper = mount(ObservationCard, {
      props: {
        observation: { id: '1', date: '2026-09-16', type: 'note', title: '今日观察', content: '观察内容很长很长' },
      },
    })
    expect(wrapper.text()).toContain('2026-09-16')
    expect(wrapper.text()).toContain('笔记')
    expect(wrapper.text()).toContain('今日观察')
    expect(wrapper.text()).toContain('观察内容很长很长')
  })

  it('emits click', async () => {
    const wrapper = mount(ObservationCard, {
      props: { observation: { id: '1' } },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})

describe('ObservationEmptyState', () => {
  it('renders empty message', () => {
    const wrapper = mount(ObservationEmptyState)
    expect(wrapper.text()).toContain('暂无观察记录')
  })
})

describe('ObservationLinkedMemory', () => {
  it('renders nothing when links is empty', () => {
    const wrapper = mount(ObservationLinkedMemory, { props: { links: [] } })
    expect(wrapper.find('.obs-memory').exists()).toBe(false)
  })

  it('renders memory links', () => {
    const wrapper = mount(ObservationLinkedMemory, {
      props: { links: [{ pageId: 'p1', title: 'Mem A' }] },
    })
    expect(wrapper.text()).toContain('Mem A')
  })
})

describe('ObservationDeleteConfirm', () => {
  it('renders confirm dialog', () => {
    const wrapper = mount(ObservationDeleteConfirm, {
      props: { open: true, title: '测试' },
    })
    expect(wrapper.text()).toContain('测试')
  })
})

describe('ObservationDetailPage', () => {
  it('renders observation details', () => {
    const wrapper = mount(ObservationDetailPage, {
      props: { observation: { id: '1', date: '2026-09-16', type: 'dream', title: '梦境', content: '内容' } },
    })
    expect(wrapper.text()).toContain('梦境')
    expect(wrapper.text()).toContain('2026-09-16')
    expect(wrapper.text()).toContain('内容')
  })

  it('emits back', async () => {
    const wrapper = mount(ObservationDetailPage, {
      props: { observation: { id: '1' } },
    })
    const btn = wrapper.findComponent({ name: 'Button' })
    await btn.trigger('click')
    expect(wrapper.emitted('back')).toBeTruthy()
  })
})