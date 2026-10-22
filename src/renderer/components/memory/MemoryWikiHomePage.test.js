import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listPages: vi.fn(),
  getPage: vi.fn(),
  createPage: vi.fn(),
  updatePage: vi.fn(),
  listVersions: vi.fn(),
  getVersionDiff: vi.fn(),
  listTopics: vi.fn(),
  listGovernance: vi.fn(),
}))

vi.mock('../../api/memory-wiki.js', () => api)

import MemoryWikiHomePage from './MemoryWikiHomePage.vue'

async function mountHome() {
  const wrapper = mount(MemoryWikiHomePage, {
    global: {
      stubs: {
        PageHeader: true,
        MemoryWikiTree: true,
        MemoryWikiDetail: true,
        MemoryWikiEditor: true,
        MemoryWikiEmptyState: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  api.listPages.mockResolvedValue({
    items: [
      { pageId: 'coffee-page', title: '咖啡偏好', pageType: 'identity_preference' },
      { pageId: 'music-page', title: '音乐偏好', pageType: 'identity_preference' },
    ],
  })
  api.listTopics.mockResolvedValue({
    items: [{ normalizedKey: 'coffee', memoryPageIds: ['coffee-page'] }],
  })
  api.getPage.mockResolvedValue({ page: { pageId: 'coffee-page', summary: '新摘要' } })
  api.updatePage.mockResolvedValue({ page: { pageId: 'coffee-page' } })
  api.listVersions.mockResolvedValue({ items: [] })
  api.getVersionDiff.mockResolvedValue({ diff: { summaryDiff: 'changed' } })
  api.listGovernance.mockResolvedValue({ items: [] })
})

describe('MemoryWikiHomePage', () => {
  it('filters already-loaded pages by topic page IDs instead of page type', async () => {
    const wrapper = await mountHome()

    await wrapper.vm.filterByTopic('coffee')

    expect(api.listPages).toHaveBeenLastCalledWith({})
    expect(wrapper.vm.pages.map((page) => page.pageId)).toEqual(['coffee-page'])
  })

  it('reloads the selected detail after saving an edit', async () => {
    const wrapper = await mountHome()
    wrapper.vm.selectedPage = { pageId: 'coffee-page', summary: '旧摘要' }
    wrapper.vm.editorInitial = { pageId: 'coffee-page', summary: '旧摘要' }

    await wrapper.vm.onSave({ title: '咖啡偏好', summary: '新摘要' })

    expect(api.updatePage).toHaveBeenCalledWith('coffee-page', { title: '咖啡偏好', summary: '新摘要' })
    expect(api.getPage).toHaveBeenCalledWith('coffee-page')
    expect(wrapper.vm.selectedPage.summary).toBe('新摘要')
  })

  it('shows a comparison explanation when fewer than two versions exist', async () => {
    const wrapper = await mountHome()
    wrapper.vm.selectedPage = { pageId: 'coffee-page' }
    api.listVersions.mockResolvedValue({ items: [{ versionId: 'v1' }] })

    await wrapper.vm.openCompare()

    expect(wrapper.findComponent({ name: 'MemoryWikiCompare' }).props('unavailable')).toBe(true)
    expect(wrapper.text()).toContain('至少需要两个版本')
  })
})
