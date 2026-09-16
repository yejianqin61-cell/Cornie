import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MemoryWikiTree from './MemoryWikiTree.vue'
import MemoryWikiDetail from './MemoryWikiDetail.vue'
import MemoryWikiSourceRef from './MemoryWikiSourceRef.vue'
import MemoryWikiRelatedLinks from './MemoryWikiRelatedLinks.vue'
import TopicChip from './TopicChip.vue'
import MemoryWikiCompare from './MemoryWikiCompare.vue'
import MemoryWikiEditor from './MemoryWikiEditor.vue'
import MemoryWikiEmptyState from './MemoryWikiEmptyState.vue'

describe('MemoryWikiTree', () => {
  const items = [
    { pageId: 'p1', pageType: 'person', title: 'Alice' },
    { pageId: 'p2', pageType: 'place', title: 'Home' },
  ]

  it('renders groups by pageType', () => {
    const wrapper = mount(MemoryWikiTree, { props: { items } })
    expect(wrapper.text()).toContain('人物')
    expect(wrapper.text()).toContain('地点')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Home')
  })

  it('emits select when clicking item', async () => {
    const wrapper = mount(MemoryWikiTree, { props: { items } })
    const firstItem = wrapper.find('.mw-tree-item')
    await firstItem.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0][0]).toBe('p1')
  })

  it('highlights active page', () => {
    const wrapper = mount(MemoryWikiTree, { props: { items, activePageId: 'p1' } })
    expect(wrapper.find('.mw-tree-item--active').text()).toContain('Alice')
  })
})

describe('TopicChip', () => {
  it('renders topic text', () => {
    const wrapper = mount(TopicChip, { props: { topic: 'AI' } })
    expect(wrapper.text()).toBe('AI')
  })

  it('applies active class', () => {
    const wrapper = mount(TopicChip, { props: { topic: 'AI', active: true } })
    expect(wrapper.classes()).toContain('topic-chip--active')
  })
})

describe('MemoryWikiSourceRef', () => {
  it('renders nothing when empty', () => {
    const wrapper = mount(MemoryWikiSourceRef, { props: { sources: [] } })
    expect(wrapper.find('.mw-sources').exists()).toBe(false)
  })

  it('renders source items', () => {
    const wrapper = mount(MemoryWikiSourceRef, {
      props: { sources: [{ label: '聊天记录 2026-09-15' }] },
    })
    expect(wrapper.text()).toContain('聊天记录 2026-09-15')
  })
})

describe('MemoryWikiRelatedLinks', () => {
  it('renders nothing when empty', () => {
    const wrapper = mount(MemoryWikiRelatedLinks, { props: { links: [] } })
    expect(wrapper.find('.mw-related').exists()).toBe(false)
  })

  it('renders links', () => {
    const wrapper = mount(MemoryWikiRelatedLinks, {
      props: { links: [{ pageId: 'p2', title: 'Related Page' }] },
    })
    expect(wrapper.text()).toContain('Related Page')
  })
})

describe('MemoryWikiEditor', () => {
  it('renders form fields', () => {
    const wrapper = mount(MemoryWikiEditor, { props: { page: { title: 'Test' } } })
    expect(wrapper.text()).toContain('编辑记忆页面')
    expect(wrapper.find('input').element.value).toBe('Test')
  })

  it('shows saving state', () => {
    const wrapper = mount(MemoryWikiEditor, { props: { page: {}, saving: true } })
    expect(wrapper.text()).toContain('保存中')
  })

  it('shows saveError', () => {
    const wrapper = mount(MemoryWikiEditor, { props: { page: {}, saveError: '保存失败' } })
    expect(wrapper.text()).toContain('保存失败')
  })
})

describe('MemoryWikiCompare', () => {
  it('renders version labels and diff', () => {
    const wrapper = mount(MemoryWikiCompare, {
      props: {
        fromVersion: { version: 'v1' },
        toVersion: { version: 'v2' },
        diff: { summaryDiff: 'changed text' },
      },
    })
    expect(wrapper.text()).toContain('v1')
    expect(wrapper.text()).toContain('v2')
    expect(wrapper.text()).toContain('changed text')
  })
})

describe('MemoryWikiDetail', () => {
  it('renders page content', () => {
    const wrapper = mount(MemoryWikiDetail, {
      props: {
        page: { pageId: 'p1', title: 'Test Page', pageType: 'concept', summary: 'Summary', body: 'Body text' },
      },
    })
    expect(wrapper.text()).toContain('Test Page')
    expect(wrapper.text()).toContain('Summary')
    expect(wrapper.text()).toContain('Body text')
  })

  it('emits back', async () => {
    const wrapper = mount(MemoryWikiDetail, {
      props: { page: { pageId: 'p1', title: 'Test' } },
    })
    const btn = wrapper.findComponent({ name: 'Button' })
    await btn.trigger('click')
    expect(wrapper.emitted('back')).toBeTruthy()
  })
})

describe('MemoryWikiEmptyState', () => {
  it('renders empty message', () => {
    const wrapper = mount(MemoryWikiEmptyState)
    expect(wrapper.text()).toContain('暂无记忆页面')
  })
})