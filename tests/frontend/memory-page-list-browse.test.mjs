import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/renderer/api', () => ({
  listMemoryWikiPages: vi.fn()
}))

import * as api from '../../src/renderer/api'
import MemoryPageList from '../../src/renderer/components/MemoryPageList.vue'

function makePage(id, pageType, title) {
  return { id, pageId: id, pageType, title, status: 'active', updatedAt: `2026-08-2${id % 9}` }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('R-05 记忆 Wiki 列表册子化', () => {
  it('初始加载带 limit/offset 分页参数', async () => {
    api.listMemoryWikiPages.mockResolvedValue({ pages: [makePage(1, 'identity_profile', '关于你')] })
    const wrapper = mount(MemoryPageList)
    await flushPromises()

    expect(api.listMemoryWikiPages).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0, status: 'active' })
    )
    wrapper.unmount()
  })

  it('类型 Tab 切换后请求带 pageType 且内容过滤', async () => {
    api.listMemoryWikiPages.mockImplementation(async ({ pageType } = {}) => {
      if (pageType === 'identity_person') {
        return { pages: [makePage(2, 'identity_person', '钟奕菲')] }
      }
      return {
        pages: [makePage(1, 'identity_profile', '我的身份页'), makePage(3, 'topic', '主题页')]
      }
    })
    const wrapper = mount(MemoryPageList)
    await flushPromises()
    expect(wrapper.text()).toContain('我的身份页')
    expect(wrapper.text()).not.toContain('钟奕菲')

    const personTab = wrapper.findAll('button').find((b) => b.text() === '重要的人')
    await personTab.trigger('click')
    await flushPromises()

    expect(api.listMemoryWikiPages).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageType: 'identity_person' })
    )
    expect(wrapper.text()).toContain('钟奕菲')
    expect(wrapper.text()).not.toContain('我的身份页') // 已过滤为仅 person 类型
    wrapper.unmount()
  })

  it('其他记忆 Tab 前端过滤普通类型', async () => {
    api.listMemoryWikiPages.mockResolvedValue({
      pages: [makePage(1, 'identity_profile', '我的身份页'), makePage(3, 'topic', '主题页')]
    })
    const wrapper = mount(MemoryPageList)
    await flushPromises()

    const otherTab = wrapper.findAll('button').find((b) => b.text() === '其他记忆')
    await otherTab.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('主题页')
    expect(wrapper.text()).not.toContain('我的身份页') // 身份页被过滤
    wrapper.unmount()
  })

  it('加载更多：offset 递增并追加条目', async () => {
    api.listMemoryWikiPages.mockImplementation(async ({ offset } = {}) => {
      const start = offset || 0
      if (start === 0) {
        return { pages: Array.from({ length: 20 }, (_, i) => makePage(i, 'topic', `主题${i}`)) }
      }
      return { pages: [makePage(99, 'topic', '追加页')] }
    })
    const wrapper = mount(MemoryPageList)
    await flushPromises()

    expect(wrapper.text()).toContain('主题0')
    expect(wrapper.text()).not.toContain('追加页')

    const moreBtn = wrapper.findAll('button').find((b) => b.text().includes('加载更多'))
    expect(moreBtn).toBeDefined()
    await moreBtn.trigger('click')
    await flushPromises()

    expect(api.listMemoryWikiPages).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 20 })
    )
    expect(wrapper.text()).toContain('追加页')
    wrapper.unmount()
  })
})
