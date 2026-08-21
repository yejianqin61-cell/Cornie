import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/renderer/api', () => ({
  listMemoryWikiPages: vi.fn()
}))

import * as api from '../../src/renderer/api'
import MemoryWikiHome from '../../src/renderer/components/MemoryWikiHome.vue'
import MemoryPageDetail from '../../src/renderer/components/MemoryPageDetail.vue'

function makePage(id, pageType, title, status = 'active', extra = {}) {
  return { id, pageId: id, pageType, title, status, content: `内容${id}`, ...extra }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('T-02 双栏容器', () => {
  it('进入容器加载 active 与 archived 两批页面', async () => {
    api.listMemoryWikiPages.mockImplementation(async ({ status } = {}) => ({
      pages: status === 'archived' ? [makePage('a1', 'topic', '旧页', 'archived')] : [makePage('p1', 'identity_profile', '我的身份页')]
    }))
    const wrapper = mount(MemoryWikiHome, {
      global: { stubs: { MemoryPageDetail: true } }
    })
    await flushPromises()

    expect(api.listMemoryWikiPages).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' })
    )
    expect(api.listMemoryWikiPages).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'archived' })
    )
    // 树渲染两类页面（已归档目录默认折叠，先展开再断言文件）
    expect(wrapper.text()).toContain('我的身份页')
    const archivedDir = wrapper.findAll('.treeDir').find((n) => n.text().includes('已归档'))
    await archivedDir.trigger('click')
    expect(wrapper.text()).toContain('旧页')
    wrapper.unmount()
  })

  it('选树节点 → 右侧详情组件加载对应 id', async () => {
    api.listMemoryWikiPages.mockResolvedValue({ pages: [makePage('p1', 'identity_profile', '我的身份页')] })
    const wrapper = mount(MemoryWikiHome, {
      global: { stubs: { MemoryPageDetail: true } }
    })
    await flushPromises()

    // 初始未选中：空态
    expect(wrapper.text()).toContain('从左边选一页')

    const file = wrapper.findAll('.treeFile').find((n) => n.text().includes('我的身份页'))
    await file.trigger('click')

    // 右侧 stub 收到 id
    const detailStub = wrapper.findComponent(MemoryPageDetail)
    expect(detailStub.exists()).toBe(true)
    expect(detailStub.props('id')).toBe('p1')
    expect(wrapper.text()).not.toContain('从左边选一页')
    wrapper.unmount()
  })

  it('新建 → 右侧进入新建模式（无 id）', async () => {
    api.listMemoryWikiPages.mockResolvedValue({ pages: [] })
    const wrapper = mount(MemoryWikiHome, {
      global: { stubs: { MemoryPageDetail: true } }
    })
    await flushPromises()

    const createBtn = wrapper.findAll('button').find((b) => b.text() === '新建记忆')
    await createBtn.trigger('click')

    const detailStub = wrapper.findComponent(MemoryPageDetail)
    expect(detailStub.exists()).toBe(true)
    expect(detailStub.props('id')).toBe('')
    wrapper.unmount()
  })

  it('删除后树刷新且右侧清空', async () => {
    api.listMemoryWikiPages.mockResolvedValue({ pages: [makePage('p1', 'identity_profile', '我的身份页')] })
    const wrapper = mount(MemoryWikiHome, {
      global: { stubs: { MemoryPageDetail: true } }
    })
    await flushPromises()

    const file = wrapper.findAll('.treeFile').find((n) => n.text().includes('我的身份页'))
    await file.trigger('click')
    expect(wrapper.findComponent(MemoryPageDetail).props('id')).toBe('p1')

    // 模拟详情 deleted 事件 → 容器刷新并清空
    wrapper.findComponent(MemoryPageDetail).vm.$emit('deleted')
    api.listMemoryWikiPages.mockResolvedValue({ pages: [] })
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('从左边选一页')
    wrapper.unmount()
  })

  // T-03：树顶搜索
  describe('T-03 树顶搜索', () => {
    async function mountWithPages(wrapperPages) {
      // active/archived 两批请求：active 返回页面，archived 返回空（避免重复）
      api.listMemoryWikiPages.mockImplementation(async ({ status } = {}) => ({
        pages: status === 'archived' ? [] : wrapperPages
      }))
      const wrapper = mount(MemoryWikiHome, {
        global: { stubs: { MemoryPageDetail: true } }
      })
      await flushPromises()
      return wrapper
    }

    it('按标题搜索命中并过滤树', async () => {
      vi.useFakeTimers()
      const wrapper = await mountWithPages([
        makePage('p1', 'identity_profile', '我的身份页'),
        makePage('p2', 'topic', '龙虾主题')
      ])
      const input = wrapper.find('input[placeholder="搜索记忆…"]')
      await input.setValue('龙虾')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()

      expect(wrapper.text()).toContain('搜索结果：1 条')
      // 主题目录默认折叠：目录计数为 1，展开后文件可见
      expect(wrapper.text()).not.toContain('我的身份页')
      const topicDir = wrapper.findAll('.treeDir').find((n) => n.text().includes('主题'))
      await topicDir.trigger('click')
      expect(wrapper.text()).toContain('龙虾主题')
      wrapper.unmount()
    })

    it('按别名与摘要搜索命中', async () => {
      vi.useFakeTimers()
      const wrapper = await mountWithPages([
        makePage('p1', 'identity_person', '钟奕菲', 'active', { aliasesText: '小菲, 菲宝' }),
        makePage('p2', 'event', '某事件', 'active', { summary: '记得那天去吃了火锅' })
      ])
      const input = wrapper.find('input[placeholder="搜索记忆…"]')
      await input.setValue('菲宝')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()
      // 身份目录默认展开：文件直接可见
      expect(wrapper.text()).toContain('钟奕菲')
      expect(wrapper.text()).not.toContain('某事件')

      await input.setValue('火锅')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()
      // 事件目录默认折叠：展开后可见
      const eventDir = wrapper.findAll('.treeDir').find((n) => n.text().includes('事件'))
      await eventDir.trigger('click')
      expect(wrapper.text()).toContain('某事件')
      wrapper.unmount()
    })

    it('无结果显示空态，清空恢复完整树', async () => {
      vi.useFakeTimers()
      const wrapper = await mountWithPages([makePage('p1', 'identity_profile', '我的身份页')])
      const input = wrapper.find('input[placeholder="搜索记忆…"]')
      await input.setValue('不存在的词')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()
      expect(wrapper.text()).toContain('没有找到相关的记忆')

      await input.setValue('')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()
      expect(wrapper.text()).toContain('我的身份页')
      expect(wrapper.text()).not.toContain('没有找到相关的记忆')
      wrapper.unmount()
    })
  })
})
