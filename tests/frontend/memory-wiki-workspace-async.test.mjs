import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import MemoryWikiWorkspace from '../../src/renderer/components/MemoryWikiWorkspace.vue'

function createMemoryWikiFetchMock() {
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
      pageIds: ['wiki-lobster'],
      aliases: ['澳龙'],
      dates: ['2026-06-27']
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
  const confirmations = [
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

    if (url.includes('/api/memory-wiki/pages?') || url.endsWith('/api/memory-wiki/pages')) {
      if (method === 'GET') {
        return { ok: true, status: 200, json: async () => ({ items: pages }), text: async () => '' }
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
        return {
          ok: true,
          status: 200,
          json: async () => ({ page: { pageId: 'wiki-memory' } }),
          text: async () => ''
        }
      }
    }

    if (url.includes('/api/memory-wiki/pages/wiki-lobster') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          page: {
            pageId: 'wiki-lobster',
            pageType: 'topic',
            title: '龙虾',
            summary: '主人反复提到的重要食物。',
            body: '这是一页关于龙虾的长期记忆。',
            aliases: ['澳龙'],
            status: 'active',
            importance: 'high'
          }
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/memory-wiki/pages/wiki-memory') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
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
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/memory-wiki/topic-index') && !url.includes('/api/memory-wiki/topic-index/lobster')) {
      return { ok: true, status: 200, json: async () => ({ items: topicItems }), text: async () => '' }
    }

    if (url.includes('/api/memory-wiki/topic-index/lobster')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ item: topicItems[0] }),
        text: async () => ''
      }
    }

    if (url.includes('/api/memory-wiki/governance?') || url.endsWith('/api/memory-wiki/governance')) {
      return { ok: true, status: 200, json: async () => ({ items: governanceItems }), text: async () => '' }
    }

    if (url.includes('/api/memory-wiki/governance/gov-1')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          item: {
            ...governanceItems[0],
            triggerSource: 'inspection',
            pageIds: ['wiki-lobster'],
            topicKeys: ['lobster'],
            reason: '内容高度重复，建议合并。',
            evidence: [{ duplicateScore: 0.93 }]
          }
        }),
        text: async () => ''
      }
    }

    if (url.includes('/api/confirmations')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ confirmations }),
        text: async () => ''
      }
    }

    if (url.includes('/api/memory-wiki/pages/wiki-memory/aliases') || url.includes('/api/memory-wiki/pages/wiki-lobster/aliases')) {
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
    }

    if (url.includes('/status') || url.includes('/importance')) {
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      text: async () => ''
    }
  })
}

describe('MemoryWikiWorkspace async flow', () => {
  beforeEach(() => {
    globalThis.fetch = createMemoryWikiFetchMock()
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
})
