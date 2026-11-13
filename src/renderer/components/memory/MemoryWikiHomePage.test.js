import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listPages: vi.fn(),
  getPage: vi.fn(),
  getPageSourceTrace: vi.fn(),
  createPage: vi.fn(),
  updatePage: vi.fn(),
  listVersions: vi.fn(),
  getVersionDiff: vi.fn(),
  listTopics: vi.fn(),
  listGovernance: vi.fn(),
  getGovernanceRequest: vi.fn(),
  updateGovernanceStatus: vi.fn(),
  applyGovernanceRequest: vi.fn(),
  setPageOwnerConfirmed: vi.fn(),
  inspectionScan: vi.fn(),
  mergePages: vi.fn(),
  listAuditEvents: vi.fn(),
}))

vi.mock('../../api/memory-wiki.js', () => api)

import MemoryWikiHomePage from './MemoryWikiHomePage.vue'

async function mountHome() {
  const wrapper = mount(MemoryWikiHomePage, {
    global: {
      stubs: {
        PageHeader: {
          props: { icon: [Object, Function], title: String },
          template: '<header><h1>{{ title }}</h1><slot name="actions" /></header>',
        },
        Button: {
          props: { as: String, asChild: Boolean, variant: String, size: String },
          template: '<button><slot /></button>',
        },
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
  api.getPageSourceTrace.mockResolvedValue({ trace: { chatSources: [], observationSources: [] } })
  api.updatePage.mockResolvedValue({ page: { pageId: 'coffee-page' } })
  api.listVersions.mockResolvedValue({ items: [] })
  api.getVersionDiff.mockResolvedValue({ diff: { summaryDiff: 'changed' } })
  api.listGovernance.mockResolvedValue({ items: [] })
  api.getGovernanceRequest.mockResolvedValue({ item: null })
  api.updateGovernanceStatus.mockResolvedValue({ item: { requestId: 'gov-1', status: 'approved' } })
  api.applyGovernanceRequest.mockResolvedValue({ result: { action: 'archive_page' } })
})

describe('MemoryWikiHomePage', () => {
  it('mounts without Vue runtime warnings', async () => {
    const warnings = []
    const warn = vi.spyOn(console, 'warn').mockImplementation((...args) => warnings.push(args.join(' ')))

    try {
      await mountHome()
      expect(warnings.filter((message) => message.includes('[Vue warn]'))).toEqual([])
    } finally {
      warn.mockRestore()
    }
  })

  it('identifies the memory workspace for assistive technologies', async () => {
    const wrapper = await mountHome()

    expect(wrapper.get('.mw-home').attributes('aria-label')).toBe('记忆工作区')
  })

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

  it('sets the owner confirmation of the selected page and reloads it', async () => {
    api.setPageOwnerConfirmed.mockResolvedValue({ page: { pageId: 'coffee-page', ownerConfirmed: true } })
    const wrapper = await mountHome()
    wrapper.vm.selectedPage = { pageId: 'coffee-page' }

    await wrapper.vm.updateSelectedOwnerConfirmed(true)

    expect(api.setPageOwnerConfirmed).toHaveBeenCalledTimes(1)
    expect(api.setPageOwnerConfirmed).toHaveBeenCalledWith('coffee-page', true)
    expect(api.getPage).toHaveBeenCalledWith('coffee-page')
  })

  it('opens the page named by focusPageId once the list is loaded', async () => {
    const wrapper = mount(MemoryWikiHomePage, {
      props: { focusPageId: 'coffee-page' },
      global: {
        stubs: {
          PageHeader: true,
          Button: { template: '<button><slot /></button>' },
          MemoryWikiTree: true,
          MemoryWikiDetail: true,
          MemoryWikiEditor: true,
          MemoryWikiEmptyState: true,
        },
      },
    })
    await flushPromises()

    expect(api.getPage).toHaveBeenCalledWith('coffee-page')
  })

  it('shows a comparison explanation when fewer than two versions exist', async () => {
    const wrapper = await mountHome()
    wrapper.vm.selectedPage = { pageId: 'coffee-page' }
    api.listVersions.mockResolvedValue({ items: [{ versionId: 'v1' }] })

    await wrapper.vm.openCompare()

    expect(wrapper.findComponent({ name: 'MemoryWikiCompare' }).props('unavailable')).toBe(true)
    expect(wrapper.text()).toContain('至少需要两个版本')
  })

  it('shows governance evidence and applies only after approval', async () => {
    const request = {
      requestId: 'gov-1',
      status: 'pending',
      reason: '归档过期偏好',
      evidence: [{ action: 'archive_page', pageId: 'coffee-page' }],
    }
    api.listGovernance.mockResolvedValue({ items: [request] })
    api.getGovernanceRequest.mockResolvedValue({ item: request })
    const wrapper = await mountHome()

    await wrapper.vm.openGovernance()
    await wrapper.vm.selectGovernance('gov-1')
    expect(wrapper.text()).toContain('归档过期偏好')
    expect(wrapper.text()).toContain('archive_page')

    await wrapper.vm.decideGovernance('approved')
    expect(api.updateGovernanceStatus).toHaveBeenCalledWith('gov-1', 'approved')

    await wrapper.vm.applyGovernance()
    expect(api.applyGovernanceRequest).toHaveBeenCalledWith('gov-1')
    expect(wrapper.text()).toContain('archive_page')
  })

  describe('merging pages', () => {
    async function mountForMerge() {
      const wrapper = await mountHome()
      wrapper.vm.allPages = [
        { pageId: 'coffee-page', title: '咖啡偏好', status: 'active' },
        { pageId: 'tea-page', title: '茶偏好', status: 'active' },
        { pageId: 'old-page', title: '旧页', status: 'archived' },
      ]
      wrapper.vm.selectedPage = { pageId: 'coffee-page', title: '咖啡偏好' }
      return wrapper
    }

    it('offers only other active pages as merge sources', async () => {
      const wrapper = await mountForMerge()
      wrapper.vm.openMerge()
      expect(wrapper.vm.mergeCandidates.map((item) => item.pageId)).toEqual(['tea-page'])
    })

    it('asks for confirmation naming the page that will be archived', async () => {
      const wrapper = await mountForMerge()
      wrapper.vm.openMerge()
      await wrapper.vm.confirmMerge('tea-page')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('将「茶偏好」合并进「咖啡偏好」，「茶偏好」会被归档。')
      expect(api.mergePages).not.toHaveBeenCalled()
    })

    it('merges into the selected page, reloads the list and keeps the target selected', async () => {
      api.mergePages.mockResolvedValue({ result: {} })
      const wrapper = await mountForMerge()
      wrapper.vm.openMerge()
      await wrapper.vm.confirmMerge('tea-page')
      api.listPages.mockClear()

      await wrapper.vm.applyMerge()

      expect(api.mergePages).toHaveBeenCalledTimes(1)
      expect(api.mergePages).toHaveBeenCalledWith('coffee-page', 'tea-page')
      expect(api.listPages).toHaveBeenCalled()
      expect(api.getPage).toHaveBeenCalledWith('coffee-page')
    })

    it('shows the merge error in the page banner', async () => {
      api.mergePages.mockRejectedValue(new Error('合并失败'))
      const wrapper = await mountForMerge()
      wrapper.vm.openMerge()
      await wrapper.vm.confirmMerge('tea-page')

      await wrapper.vm.applyMerge()
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('合并失败')
    })
  })

  describe('inspection and audit', () => {
    it('runs an inspection, reloads the queue and reports how many suggestions were added', async () => {
      api.inspectionScan.mockResolvedValue({ result: { createdCount: 2 } })
      const wrapper = await mountHome()
      await wrapper.vm.openGovernance()
      api.listGovernance.mockClear()

      await wrapper.vm.runInspection()

      expect(api.inspectionScan).toHaveBeenCalledTimes(1)
      expect(api.listGovernance).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).toContain('新增 2 条建议')
    })

    it('ignores a second inspection while one is running', async () => {
      let finish
      api.inspectionScan.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      const wrapper = await mountHome()
      await wrapper.vm.openGovernance()

      const first = wrapper.vm.runInspection()
      await wrapper.vm.runInspection()
      expect(api.inspectionScan).toHaveBeenCalledTimes(1)

      finish({ result: { createdCount: 0 } })
      await first
    })

    it('lists audit events with Chinese type labels', async () => {
      api.listAuditEvents.mockResolvedValue({
        items: [
          { eventId: 'e1', eventType: 'page_updated', pageId: 'coffee-page', createdAt: '2026-11-12T10:00:00.000Z' },
          {
            eventId: 'e2',
            eventType: 'pages_merged',
            pageId: 'coffee-page',
            reason: '合并',
            createdAt: '2026-11-12T09:00:00.000Z',
          },
        ],
      })
      const wrapper = await mountHome()

      await wrapper.vm.openAudit()

      expect(api.listAuditEvents).toHaveBeenCalledWith({ limit: 50 })
      expect(wrapper.text()).toContain('页面更新')
      expect(wrapper.text()).toContain('页面合并')
      expect(wrapper.text()).not.toContain('page_updated')
    })

    it('falls back to the raw value for an unknown audit event type', async () => {
      api.listAuditEvents.mockResolvedValue({
        items: [{ eventId: 'e9', eventType: 'brand_new_event', createdAt: '2026-11-12T10:00:00.000Z' }],
      })
      const wrapper = await mountHome()

      await wrapper.vm.openAudit()

      expect(wrapper.text()).toContain('brand_new_event')
    })
  })

  describe('governance panel wording', () => {
    async function openWith(items, selected = null) {
      api.listGovernance.mockResolvedValue({ items })
      if (selected) api.getGovernanceRequest.mockResolvedValue({ item: selected })
      const wrapper = await mountHome()
      await wrapper.vm.openGovernance()
      if (selected) await wrapper.vm.selectGovernance(selected.requestId)
      return wrapper
    }

    it('shows Chinese type and status labels instead of the raw enums', async () => {
      const wrapper = await openWith([
        { requestId: 'gov-1', requestType: 'memory_wiki_llm_proposal', status: 'pending', title: '归档咖啡页' },
      ])
      expect(wrapper.text()).toContain('LLM 记忆变更提议')
      expect(wrapper.text()).toContain('待审')
      expect(wrapper.text()).toContain('归档咖啡页')
      expect(wrapper.text()).not.toContain('memory_wiki_llm_proposal')
    })

    it('summarises the planned action and reason in the detail', async () => {
      const request = {
        requestId: 'gov-1',
        requestType: 'memory_wiki_llm_proposal',
        status: 'pending',
        title: '归档咖啡页',
        reason: '归档过期偏好',
        pageIds: ['coffee-page'],
        evidence: [{ action: 'archive_page', pageId: 'coffee-page' }],
        payload: { request: { action: 'archive_page' } },
      }
      const wrapper = await openWith([request], request)
      const detail = wrapper.get('.mw-governance-detail').text()
      expect(detail).toContain('归档页面')
      expect(detail).toContain('归档过期偏好')
      expect(detail).toContain('coffee-page')
    })

    it('falls back to the raw value for an unknown request type', async () => {
      const wrapper = await openWith([
        { requestId: 'gov-9', requestType: 'brand_new_type', status: 'pending', title: '未知' },
      ])
      expect(wrapper.text()).toContain('brand_new_type')
    })

    it('labels all five statuses', async () => {
      const statuses = ['pending', 'approved', 'rejected', 'deferred', 'applied']
      const wrapper = await openWith(
        statuses.map((status, index) => ({
          requestId: 'gov-' + index,
          requestType: 'archive_candidate',
          status,
          title: 't' + index,
        }))
      )
      for (const label of ['待审', '已批准', '已拒绝', '已延期', '已应用']) {
        expect(wrapper.text()).toContain(label)
      }
    })

    it('keeps the raw data inside a collapsed details element', async () => {
      const request = {
        requestId: 'gov-1',
        requestType: 'archive_candidate',
        status: 'pending',
        title: 't',
        evidence: [{ action: 'archive_page' }],
      }
      const wrapper = await openWith([request], request)
      const details = wrapper.get('details')
      expect(details.attributes('open')).toBeUndefined()
      expect(details.text()).toContain('archive_page')
    })
  })
})
