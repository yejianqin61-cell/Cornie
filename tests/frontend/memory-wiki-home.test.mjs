import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/renderer/api', () => ({
  listMemoryWikiPages: vi.fn()
}))

import * as api from '../../src/renderer/api'
import MemoryWikiHome from '../../src/renderer/components/MemoryWikiHome.vue'
import MemoryPageDetail from '../../src/renderer/components/MemoryPageDetail.vue'

function makePage(id, pageType, title, status = 'active') {
  return { id, pageId: id, pageType, title, status, content: `内容${id}` }
}

beforeEach(() => {
  vi.clearAllMocks()
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
})
