import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import MemoryWikiWorkspace from '../../src/renderer/components/MemoryWikiWorkspace.vue'

function createResponse({ ok = true, status = 200, json = {}, text = '' } = {}) {
  return {
    ok,
    status,
    json: async () => json,
    text: async () => text
  }
}

function createMemoryWikiFetchMock(options = {}) {
  const failPageDetail = options.failPageDetail ?? false
  const failConfirmationReject = options.failConfirmationReject ?? false
  const topicWithoutDates = options.topicWithoutDates ?? false
  const topicWithoutPages = options.topicWithoutPages ?? false
  const governanceWithoutReason = options.governanceWithoutReason ?? false
  const governanceWithoutEvidence = options.governanceWithoutEvidence ?? false
  const emptyConfirmations = options.emptyConfirmations ?? false

  const pages = [
    {
      pageId: 'wiki-lobster',
      title: '龙虾',
      pageType: 'topic',
      status: 'active',
      importance: 'high'
    }
  ]
  const topicItems = [
    {
      normalizedKey: 'lobster',
      keyword: '龙虾',
      heatScore: 3,
      pageIds: topicWithoutPages ? [] : ['wiki-lobster'],
      aliases: ['澳龙'],
      dates: topicWithoutDates ? [] : ['2026-06-27']
    }
  ]
  const governanceItems = [
    {
      requestId: 'gov-1',
      title: '建议合并龙虾相关页面',
      requestType: 'merge_candidate',
      queueSection: 'merge',
      status: 'pending',
      riskLevel: 'medium'
    }
  ]
  const confirmations = emptyConfirmations
    ? []
    : [
        {
          id: 'confirm-1',
          status: 'pending',
          confirmRequest: {
            title: '确认是否新建龙虾类目',
            reason: '当前没有足够贴切的类目。',
            details: ['领域：ledger', '建议：龙虾聚餐']
          }
        }
      ]

  return vi.fn(async (input, init) => {
    const url = String(input)
    const method = init?.method || 'GET'
    const parsedUrl = new URL(url, 'http://localhost')

    if (url.includes('/api/memory-wiki/pages?') || url.endsWith('/api/memory-wiki/pages')) {
      if (method === 'GET') {
        return createResponse({ json: { items: pages } })
      }

      if (method === 'POST') {
        const payload = JSON.parse(init.body)
        pages.push({
          pageId: 'wiki-memory',
          title: payload.title,
          pageType: payload.pageType,
          status: 'active',
          importance: 'medium'
        })
        return createResponse({ json: { page: { pageId: 'wiki-memory' } } })
      }
    }

    if (url.includes('/api/memory-wiki/pages/wiki-lobster') && method === 'GET') {
      if (failPageDetail) {
        return createResponse({
          ok: false,
          status: 500,
          json: {},
          text: '读取记忆页面详情失败。'
        })
      }

      return createResponse({
        json: {
          page: {
            pageId: 'wiki-lobster',
            pageType: 'topic',
            title: '龙虾',
            summary: '主人反复提到的重要食物。',
            body: '这是一页关于龙虾的长期记忆。',
            aliases: ['澳龙'],
            status: pages[0].status,
            importance: pages[0].importance
          }
        }
      })
    }

    if (url.includes('/api/memory-wiki/pages/wiki-memory') && method === 'GET') {
      return createResponse({
        json: {
          page: {
            pageId: 'wiki-memory',
            pageType: 'topic',
            title: '记忆治理',
            summary: '',
            body: '',
            aliases: [],
            status: 'active',
            importance: 'medium'
          }
        }
      })
    }

    if (url.includes('/api/memory-wiki/topic-index') && !url.includes('/api/memory-wiki/topic-index/lobster')) {
      return createResponse({ json: { items: topicItems } })
    }

    if (url.includes('/api/memory-wiki/topic-index/lobster')) {
      return createResponse({
        json: {
          item: {
            ...topicItems[0],
            memoryPageIds: ['wiki-lobster']
          }
        }
      })
    }

    if (url.includes('/api/memory-wiki/governance?') || url.endsWith('/api/memory-wiki/governance')) {
      const status = parsedUrl.searchParams.get('status')
      const queueSection = parsedUrl.searchParams.get('queueSection')
      const items = governanceItems.filter((item) => {
        const statusMatched = !status || item.status === status
        const sectionMatched = !queueSection || item.queueSection === queueSection
        return statusMatched && sectionMatched
      })
      return createResponse({ json: { items } })
    }

    if (url.includes('/api/memory-wiki/governance/gov-1')) {
      const item = governanceItems.find((entry) => entry.requestId === 'gov-1') || governanceItems[0]
      return createResponse({
        json: {
          item: {
            ...item,
            triggerSource: 'inspection',
            pageIds: ['wiki-lobster'],
            topicKeys: ['lobster'],
            reason: governanceWithoutReason ? '' : '内容高度重复，建议合并。',
            evidence: governanceWithoutEvidence ? [] : [{ duplicateScore: 0.93 }]
          }
        }
      })
    }

    if (url.includes('/api/memory-wiki/topic-index/lobster/aliases') && method === 'PUT') {
      const payload = JSON.parse(init.body)
      topicItems[0].aliases = payload.aliases
      return createResponse({ json: { ok: true } })
    }

    if (url.includes('/api/memory-wiki/governance/inspection-scan') && method === 'POST') {
      governanceItems.push({
        requestId: 'gov-2',
        title: '巡检发现新的合并候选',
        requestType: 'inspection_candidate',
        queueSection: 'inspection',
        status: 'pending',
        riskLevel: 'low'
      })
      return createResponse({ json: { ok: true } })
    }

    if (url.includes('/api/memory-wiki/governance/') && url.endsWith('/status') && method === 'PUT') {
      const id = url.split('/').slice(-2)[0]
      const payload = JSON.parse(init.body)
      const item = governanceItems.find((entry) => entry.requestId === id)
      if (item) item.status = payload.status
      return createResponse({ json: { ok: true } })
    }

    if (url.includes('/api/confirmations/') && url.endsWith('/decision') && method === 'POST') {
      const id = url.split('/').slice(-2)[0]
      const payload = JSON.parse(init.body)

      if (failConfirmationReject && payload.decision === 'reject') {
        return createResponse({
          ok: false,
          status: 500,
          json: {},
          text: '拒绝确认时出错了。'
        })
      }

      const item = confirmations.find((entry) => entry.id === id)
      if (item) {
        item.status = payload.decision === 'approve' ? 'approved' : 'rejected'
      }
      return createResponse({
        json: {
          confirmation: {
            id,
            status: payload.decision === 'approve' ? 'approved' : 'rejected'
          }
        }
      })
    }

    if (url.includes('/api/confirmations')) {
      return createResponse({ json: { confirmations } })
    }

    if (url.includes('/api/memory-wiki/pages/wiki-lobster/archive') && method === 'POST') {
      pages[0].status = 'archived'
      return createResponse({ json: { ok: true } })
    }

    if (url.includes('/api/memory-wiki/pages/wiki-lobster/restore') && method === 'POST') {
      pages[0].status = 'active'
      return createResponse({ json: { ok: true } })
    }

    if (url.includes('/api/memory-wiki/pages/wiki-lobster/rollback') && method === 'POST') {
      return createResponse({ json: { ok: true } })
    }

    if (
      url.includes('/api/memory-wiki/pages/wiki-memory/aliases') ||
      url.includes('/api/memory-wiki/pages/wiki-lobster/aliases')
    ) {
      return createResponse({ json: { ok: true } })
    }

    if (url.endsWith('/status') || url.endsWith('/importance')) {
      return createResponse({ json: { ok: true } })
    }

    return createResponse({ json: { ok: true } })
  })
}

describe('MemoryWikiWorkspace async flow', () => {
  beforeEach(() => {
    globalThis.fetch = createMemoryWikiFetchMock()
    globalThis.window.prompt = vi.fn(() => 'version-1')
  })

  it('loads wiki data, opens details, and creates a new page', async () => {
    const wrapper = mount(MemoryWikiWorkspace)
    await flushPromises()

    expect(wrapper.text()).toContain('Memory Wiki 工作台')
    expect(wrapper.text()).toContain('龙虾')
    expect(wrapper.text()).toContain('建议合并龙虾相关页面')
    expect(wrapper.text()).toContain('确认是否新建龙虾类目')

    const pageRows = wrapper.findAll('.workspaceCard .entryRow')
    await pageRows[0].trigger('click')
    await flushPromises()
    const textareas = wrapper.findAll('textarea')
    expect(textareas[0].element.value).toBe('主人反复提到的重要食物。')
    expect(textareas[1].element.value).toContain('这是一页关于龙虾的长期记忆。')

    const resetButton = wrapper.findAll('button').find((button) => button.text() === '新建页面')
    await resetButton.trigger('click')
    await flushPromises()

    const titleInput = wrapper.find('input[placeholder="输入页面标题"]')
    await titleInput.setValue('记忆治理')
    const saveButtons = wrapper.findAll('button')
    const savePageButton = saveButtons.find((button) => button.text() === '保存页面')
    await savePageButton.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/memory-wiki/pages'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(wrapper.text()).toContain('记忆治理')
  })

  it('supports topic alias save, inspection enqueue, governance status change, archive/restore/rollback, and confirmation approval', async () => {
    const wrapper = mount(MemoryWikiWorkspace)
    await flushPromises()

    const topicRow = wrapper.findAll('.topicList .entryRow')[0]
    await topicRow.trigger('click')
    await flushPromises()

    const topicAliasInput = wrapper.find('.topicAliases input')
    await topicAliasInput.setValue('澳龙, 小龙虾')
    const saveAliasButton = wrapper.findAll('button').find((button) => button.text() === '保存主题别名')
    await saveAliasButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/memory-wiki/topic-index/lobster/aliases'),
      expect.objectContaining({ method: 'PUT' })
    )

    const inspectionButton = wrapper.findAll('button').find((button) => button.text() === '运行巡检入池')
    await inspectionButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('巡检发现新的合并候选')

    const pageRow = wrapper.findAll('.workspaceCard .entryRow').find((row) => row.text().includes('龙虾'))
    await pageRow.trigger('click')
    await flushPromises()

    const archiveButton = wrapper.findAll('.actionRow button').find((button) => button.text() === '归档页面')
    await archiveButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/memory-wiki/pages/wiki-lobster/archive'),
      expect.objectContaining({ method: 'POST' })
    )

    const restoreButton = wrapper.findAll('.actionRow button').find((button) => button.text() === '恢复页面')
    await restoreButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/memory-wiki/pages/wiki-lobster/restore'),
      expect.objectContaining({ method: 'POST' })
    )

    const rollbackButton = wrapper.findAll('.actionRow button').find((button) => button.text() === '版本回滚')
    await rollbackButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(globalThis.window.prompt).toHaveBeenCalledWith('请输入要回滚到的版本 ID')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/memory-wiki/pages/wiki-lobster/rollback'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ versionId: 'version-1' }) })
    )

    const governanceRow = wrapper.findAll('.workspaceCard .entryRow').find((row) => row.text().includes('建议合并龙虾相关页面'))
    await governanceRow.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('内容高度重复，建议合并。')

    const markApprovedButton = wrapper.findAll('.actionRow button').find((button) => button.text() === '标记已处理')
    await markApprovedButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/memory-wiki/governance/gov-1/status'),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'approved' }) })
    )
    expect(wrapper.text()).toContain('当前待处理 2 项')

    const confirmApproveButton = wrapper.findAll('.confirmBtnPrimary')[0]
    await confirmApproveButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('已同意，正在继续处理。')
  })

  it('supports governance defer and reject actions plus confirmation reject flow', async () => {
    const wrapper = mount(MemoryWikiWorkspace)
    await flushPromises()

    const governanceRow = wrapper.findAll('.workspaceCard .entryRow').find((row) => row.text().includes('建议合并龙虾相关页面'))
    await governanceRow.trigger('click')
    await flushPromises()

    const deferButton = wrapper.findAll('.actionRow button').find((button) => button.text() === '稍后再看')
    await deferButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/memory-wiki/governance/gov-1/status'),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'deferred' }) })
    )

    await governanceRow.trigger('click')
    await flushPromises()
    const rejectGovernanceButton = wrapper.findAll('.actionRow button').find((button) => button.text() === '驳回建议')
    await rejectGovernanceButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/memory-wiki/governance/gov-1/status'),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'rejected' }) })
    )

    const rejectConfirmButton = wrapper.findAll('.confirmBtn')[1]
    await rejectConfirmButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('已拒绝，本次不会执行。')
  })

  it('shows readable errors when page detail loading or confirmation rejection fails', async () => {
    globalThis.fetch = createMemoryWikiFetchMock({
      failPageDetail: true,
      failConfirmationReject: true
    })

    const wrapper = mount(MemoryWikiWorkspace)
    await flushPromises()

    const pageRow = wrapper.findAll('.workspaceCard .entryRow').find((row) => row.text().includes('龙虾'))
    await pageRow.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('读取记忆页面详情失败。')

    const rejectConfirmButton = wrapper.findAll('.confirmBtn')[1]
    await rejectConfirmButton.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('处理失败，可以稍后重试。')
    expect(wrapper.text()).toContain('拒绝确认时出错了。')
  })

  it('clears selected governance detail when filters remove the current item', async () => {
    const wrapper = mount(MemoryWikiWorkspace)
    await flushPromises()

    const governanceRow = wrapper.findAll('.workspaceCard .entryRow').find((row) => row.text().includes('建议合并龙虾相关页面'))
    await governanceRow.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('内容高度重复，建议合并。')

    const governanceStatusSelect = wrapper.findAll('select').find((select) => select.element.value === 'pending')
    await governanceStatusSelect.setValue('approved')
    await flushPromises()
    await flushPromises()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/memory-wiki/governance?status=approved'),
      expect.anything()
    )
    expect(wrapper.text()).toContain('点左边一条治理请求，我就把它的原因、证据和处理入口摊给你看。')
  })

  it('shows topic, governance, and confirmation fallback states', async () => {
    globalThis.fetch = createMemoryWikiFetchMock({
      topicWithoutDates: true,
      topicWithoutPages: true,
      governanceWithoutReason: true,
      governanceWithoutEvidence: true,
      emptyConfirmations: true
    })

    const wrapper = mount(MemoryWikiWorkspace)
    await flushPromises()

    expect(wrapper.text()).toContain('现在没有排队等你点头的高风险动作，小铃湾先乖乖看着。')
    expect(wrapper.text()).toContain('点一个主题，我就把它的索引详情展开给主人看。')
    expect(wrapper.text()).toContain('点左边一条治理请求，我就把它的原因、证据和处理入口摊给你看。')

    const topicRow = wrapper.findAll('.topicList .entryRow')[0]
    await topicRow.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('相关日期：无')
    expect(wrapper.text()).toContain('关联页面：无')

    const governanceRow = wrapper.findAll('.workspaceCard .entryRow').find((row) => row.text().includes('建议合并龙虾相关页面'))
    await governanceRow.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('暂无原因说明')
    expect(wrapper.find('.evidenceBlock').exists()).toBe(false)
  })

  it('does not request rollback when prompt is cancelled', async () => {
    globalThis.window.prompt = vi.fn(() => '')
    const wrapper = mount(MemoryWikiWorkspace)
    await flushPromises()

    const pageRow = wrapper.findAll('.workspaceCard .entryRow').find((row) => row.text().includes('龙虾'))
    await pageRow.trigger('click')
    await flushPromises()

    const rollbackButton = wrapper.findAll('.actionRow button').find((button) => button.text() === '版本回滚')
    await rollbackButton.trigger('click')
    await flushPromises()

    expect(globalThis.window.prompt).toHaveBeenCalledWith('请输入要回滚到的版本 ID')
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/memory-wiki/pages/wiki-lobster/rollback'),
      expect.anything()
    )
  })
})
