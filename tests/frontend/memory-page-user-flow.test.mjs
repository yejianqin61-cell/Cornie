import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import MemoryPageDetail from '../../src/renderer/components/MemoryPageDetail.vue'

function createResponse({ ok = true, status = 200, json = {}, text = '' } = {}) {
  return {
    ok,
    status,
    json: async () => json,
    text: async () => text
  }
}

const PROFILE_PAGE = {
  pageId: 'wiki-profile',
  pageType: 'identity_profile',
  title: '叶健钦',
  summary: '一个想被好好记住的人。',
  body: '这是关于主人自己的长期记忆。',
  updatedAt: '2026-06-27T10:00:00.000Z'
}

const EVENT_PAGE = {
  pageId: 'wiki-event',
  pageType: 'event',
  title: '去海边旅行',
  summary: '夏天去看海。',
  body: '我们七月去了海边，风很大。',
  updatedAt: '2026-06-26T10:00:00.000Z'
}

const SOURCE_TRACE = {
  trace: {
    page: PROFILE_PAGE,
    chatSources: [
      {
        kind: 'chat',
        date: '2026-06-27',
        messageId: 'msg-1',
        exists: true,
        preview: '主人提到想吃龙虾',
        title: '2026-06-27 对话'
      }
    ],
    observationSources: [
      {
        kind: 'observation',
        observationId: 'obs-1',
        date: '2026-06-26',
        title: '观察：想学钢琴',
        preview: '主人说想开始学钢琴。'
      }
    ],
    relatedPages: [
      {
        pageId: 'wiki-lobster',
        pageType: 'topic',
        title: '龙虾'
      }
    ],
    sourceRefs: [],
    relatedIssues: []
  }
}

/**
 * MemoryPageDetail / MemoryPageList 通用 fetch mock。
 * options：
 *  - failPageDetail   : 详情 GET 返回 500
 *  - failSourceTrace  : 来源摘要 GET 返回 500
 *  - failCreate       : 新建 POST 返回 500
 *  - failUpdate       : 编辑 PUT 返回 500
 *  - failArchive      : 归档 POST 返回 500
 *  - failList         : 列表 GET 返回 500
 */
function createMemoryUserFetchMock(options = {}) {
  const failPageDetail = options.failPageDetail ?? false
  const failSourceTrace = options.failSourceTrace ?? false
  const failCreate = options.failCreate ?? false
  const failUpdate = options.failUpdate ?? false
  const failArchive = options.failArchive ?? false
  const failList = options.failList ?? false

  const createdPageId = { current: 'wiki-new' }

  return vi.fn(async (input, init) => {
    const url = String(input)
    const method = init?.method || 'GET'

    // 列表（含 status=active 查询参数）
    if (url.includes('/api/memory-wiki/pages?') || url.endsWith('/api/memory-wiki/pages')) {
      if (method === 'GET') {
        if (failList) {
          return createResponse({ ok: false, status: 500, text: '刷新记忆页面失败。' })
        }
        return createResponse({
          json: {
            items: [PROFILE_PAGE, EVENT_PAGE]
          }
        })
      }
      if (method === 'POST') {
        if (failCreate) {
          return createResponse({ ok: false, status: 500, text: '创建记忆页面失败。' })
        }
        const payload = JSON.parse(init.body)
        createdPageId.current = `wiki-created-${String(payload.title || '').length}`
        return createResponse({ json: { page: { pageId: createdPageId.current, ...payload } } })
      }
    }

    // 来源摘要（要先于单页详情匹配）
    if (url.includes('/api/memory-wiki/pages/') && url.endsWith('/source-trace')) {
      if (failSourceTrace) {
        return createResponse({ ok: false, status: 500, text: '读取来源摘要失败。' })
      }
      return createResponse({ json: SOURCE_TRACE })
    }

    // 单页详情
    if (url.includes('/api/memory-wiki/pages/')) {
      if (method === 'GET') {
        if (failPageDetail) {
          return createResponse({ ok: false, status: 500, text: '读取记忆页面详情失败。' })
        }
        if (url.includes('wiki-event')) {
          return createResponse({ json: { page: EVENT_PAGE } })
        }
        return createResponse({ json: { page: PROFILE_PAGE } })
      }
      if (method === 'PUT') {
        if (failUpdate) {
          return createResponse({ ok: false, status: 500, text: '更新记忆页面失败。' })
        }
        return createResponse({ json: { page: { ...PROFILE_PAGE, ...JSON.parse(init.body) } } })
      }
      if (url.endsWith('/archive') && method === 'POST') {
        if (failArchive) {
          return createResponse({ ok: false, status: 500, text: '归档记忆页面失败。' })
        }
        return createResponse({ json: { page: { ...PROFILE_PAGE, status: 'archived' } } })
      }
    }

    return createResponse({ json: { ok: true } })
  })
}

describe('MemoryPageDetail 普通用户记忆收口', () => {
  // R-06：已有记忆默认阅读态——需要表单/引导的用例先进入编辑态
  async function enterEdit(wrapper) {
    const editButton = wrapper.findAll('button').find((b) => b.text() === '编辑')
    expect(editButton).toBeTruthy()
    await editButton.trigger('click')
    await flushPromises()
  }

  beforeEach(() => {
    globalThis.fetch = createMemoryUserFetchMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('新建流程：完整表单可填（含普通类型），保存后 POST 并 emit created', async () => {
    const wrapper = mount(MemoryPageDetail)
    await flushPromises()

    expect(wrapper.text()).toContain('新建长期记忆')

    // 页面类型选择包含 identity 四类与普通类型
    const select = wrapper.find('select')
    expect(select.text()).toContain('关于你')
    expect(select.text()).toContain('生活事件')
    expect(select.text()).toContain('主题')

    // 普通类型有差异表达：选 event 后引导文案与占位符切换
    await select.setValue('event')
    await flushPromises()
    expect(wrapper.text()).toContain('把这件想记住的事写下来')
    expect(wrapper.find('.mdetailTypePill').text()).toContain('生活事件')

    await wrapper.find('.mdetailTitle').setValue('去海边旅行')
    await wrapper.find('.mdetailSummary').setValue('夏天去看海。')
    await wrapper.find('.mdetailContent').setValue('我们七月去了海边，风很大。')

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '创建这页记忆')
    await saveButton.trigger('click')
    await flushPromises()
    await flushPromises()

    const postCall = globalThis.fetch.mock.calls.find(
      ([url, init]) => String(url).includes('/api/memory-wiki/pages') && init?.method === 'POST'
    )
    expect(postCall).toBeTruthy()
    expect(JSON.parse(postCall[1].body)).toMatchObject({
      pageType: 'event',
      title: '去海边旅行',
      summary: '夏天去看海。',
      body: '我们七月去了海边，风很大。'
    })
    expect(wrapper.emitted('created')).toBeTruthy()
    expect(wrapper.emitted('created')[0][0]).toBe('wiki-created-5')
  })

  it('新建流程：标题为空时给出平实提示且不发请求', async () => {
    const wrapper = mount(MemoryPageDetail)
    await flushPromises()

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '创建这页记忆')
    await saveButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('先给这页记忆起个名字吧。')
    const postCalls = globalThis.fetch.mock.calls.filter(
      ([url, init]) => String(url).includes('/api/memory-wiki/pages') && init?.method === 'POST'
    )
    expect(postCalls.length).toBe(0)
  })

  it('编辑流程：加载真实页面填充表单，修改后 PUT 保存', async () => {
    const wrapper = mount(MemoryPageDetail, { props: { id: 'wiki-profile' } })
    await flushPromises()
    await enterEdit(wrapper)

    expect(wrapper.find('.mdetailTitle').element.value).toBe('叶健钦')
    expect(wrapper.find('.mdetailSummary').element.value).toBe('一个想被好好记住的人。')
    expect(wrapper.find('.mdetailContent').element.value).toBe('这是关于主人自己的长期记忆。')
    expect(wrapper.find('.mdetailTypePill').text()).toContain('关于你')

    // 未修改时保存按钮禁用（dirty 门控）
    const saveButtonBefore = wrapper.findAll('button').find((button) => button.text() === '保存修改')
    expect(saveButtonBefore.attributes('disabled')).toBeDefined()

    await wrapper.find('.mdetailTitle').setValue('叶健钦（新版）')
    const saveButton = wrapper.findAll('button').find((button) => button.text() === '保存修改')
    expect(saveButton.attributes('disabled')).toBeUndefined()

    await saveButton.trigger('click')
    await flushPromises()
    await flushPromises()

    const putCall = globalThis.fetch.mock.calls.find(
      ([url, init]) => String(url).includes('/api/memory-wiki/pages/wiki-profile') && init?.method === 'PUT'
    )
    expect(putCall).toBeTruthy()
    expect(JSON.parse(putCall[1].body)).toMatchObject({
      pageType: 'identity_profile',
      title: '叶健钦（新版）',
      summary: '一个想被好好记住的人。',
      body: '这是关于主人自己的长期记忆。'
    })
  })

  it('删除流程：组件内二次确认（不用原生 confirm），确认后归档并 emit deleted', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const wrapper = mount(MemoryPageDetail, { props: { id: 'wiki-profile' } })
    await flushPromises()

    const deleteButton = wrapper.findAll('button').find((button) => button.text() === '删除这页')
    await deleteButton.trigger('click')
    await flushPromises()

    // 出现组件内确认态，且没有调用原生 confirm
    expect(wrapper.text()).toContain('要把这页记忆收起来吗？')
    expect(confirmSpy).not.toHaveBeenCalled()

    const confirmDeleteButton = wrapper.findAll('button').find((button) => button.text() === '确认删除')
    await confirmDeleteButton.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/memory-wiki/pages/wiki-profile/archive'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(wrapper.emitted('deleted')).toBeTruthy()
  })

  it('删除流程：点击“再想想”可取消，不发归档请求', async () => {
    const wrapper = mount(MemoryPageDetail, { props: { id: 'wiki-profile' } })
    await flushPromises()

    const deleteButton = wrapper.findAll('button').find((button) => button.text() === '删除这页')
    await deleteButton.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('要把这页记忆收起来吗？')

    const cancelButton = wrapper.findAll('button').find((button) => button.text() === '再想想')
    await cancelButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('要把这页记忆收起来吗？')
    const archiveCalls = globalThis.fetch.mock.calls.filter(([url, init]) =>
      String(url).includes('/archive') && init?.method === 'POST'
    )
    expect(archiveCalls.length).toBe(0)
    expect(wrapper.emitted('deleted')).toBeUndefined()
  })

  it('加载失败：显示纯错误态，不出现可编辑空表单，保存禁用', async () => {
    globalThis.fetch = createMemoryUserFetchMock({ failPageDetail: true })
    const wrapper = mount(MemoryPageDetail, { props: { id: 'wiki-profile' } })
    await flushPromises()

    expect(wrapper.text()).toContain('这页记忆暂时没打开成功')
    // 没有可编辑表单覆盖真实页面
    expect(wrapper.findAll('textarea').length).toBe(0)
    expect(wrapper.findAll('input').length).toBe(0)
    // R-06：加载失败时编辑与删除都被禁用/隐藏
    const editButton = wrapper.findAll('button').find((button) => button.text() === '编辑')
    expect(editButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('删除这页')

    // 提供重试入口
    const retryButton = wrapper.findAll('button').find((button) => button.text() === '再试一次')
    expect(retryButton).toBeTruthy()
  })

  it('来源摘要失败也走纯错误态（不展示可编辑空表单）', async () => {
    globalThis.fetch = createMemoryUserFetchMock({ failSourceTrace: true })
    const wrapper = mount(MemoryPageDetail, { props: { id: 'wiki-profile' } })
    await flushPromises()

    expect(wrapper.text()).toContain('这页记忆暂时没打开成功')
    expect(wrapper.findAll('textarea').length).toBe(0)
  })

  it('保存失败：新建时显示错误信息且不 emit created', async () => {
    globalThis.fetch = createMemoryUserFetchMock({ failCreate: true })
    const wrapper = mount(MemoryPageDetail)
    await flushPromises()

    await wrapper.find('.mdetailTitle').setValue('学钢琴')
    const saveButton = wrapper.findAll('button').find((button) => button.text() === '创建这页记忆')
    await saveButton.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('这页记忆还没能存好')
    expect(wrapper.emitted('created')).toBeUndefined()
  })

  it('编辑保存失败：显示错误信息且内容仍在表单里', async () => {
    globalThis.fetch = createMemoryUserFetchMock({ failUpdate: true })
    const wrapper = mount(MemoryPageDetail, { props: { id: 'wiki-profile' } })
    await flushPromises()
    await enterEdit(wrapper)

    await wrapper.find('.mdetailTitle').setValue('叶健钦（新版）')
    const saveButton = wrapper.findAll('button').find((button) => button.text() === '保存修改')
    await saveButton.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('这次修改还没保存成功')
    expect(wrapper.find('.mdetailTitle').element.value).toBe('叶健钦（新版）')
  })

  it('普通类型详情有差异表达：类型胶囊与引导文案不同', async () => {
    const ordinaryWrapper = mount(MemoryPageDetail, { props: { id: 'wiki-event' } })
    await flushPromises()
    await enterEdit(ordinaryWrapper)

    expect(ordinaryWrapper.find('.mdetailTypePill').text()).toContain('生活事件')
    expect(ordinaryWrapper.find('.mdetailTypePill').text()).toContain('📖')
    expect(ordinaryWrapper.find('.mdetailTypePill').classes()).toContain('mdetailTypePillOrdinary')
    expect(ordinaryWrapper.text()).toContain('把这件想记住的事写下来')
    expect(ordinaryWrapper.find('.mdetailTitle').element.placeholder).toContain('一次旅行')

    const identityWrapper = mount(MemoryPageDetail, { props: { id: 'wiki-profile' } })
    await flushPromises()
    await enterEdit(identityWrapper)
    expect(identityWrapper.find('.mdetailTypePill').text()).toContain('关于你')
    expect(identityWrapper.find('.mdetailTypePill').text()).toContain('✨')
    expect(identityWrapper.find('.mdetailTypePill').classes()).not.toContain('mdetailTypePillOrdinary')
  })

  it('来源摘要分组展示，聊天来源可跳转、观察/相关页可打开', async () => {
    const wrapper = mount(MemoryPageDetail, { props: { id: 'wiki-profile' } })
    await flushPromises()
    // R-06：来源概览（聊天来源/观察记录/相关记忆）在编辑态；阅读态也有来源区块（跳转可用）
    await enterEdit(wrapper)

    expect(wrapper.text()).toContain('这页记忆是怎么来的')
    expect(wrapper.text()).toContain('聊天来源')
    expect(wrapper.text()).toContain('观察记录')
    expect(wrapper.text()).toContain('相关记忆')
    expect(wrapper.text()).toContain('铃湾是从这些聊天里慢慢记住它的')
    expect(wrapper.text()).toContain('主人提到想吃龙虾')

    // 聊天来源 → open-chat-source（date + messageId，供 App 组装 mode=chat 跳转）
    const chatItem = wrapper.findAll('.sourceItem')[0]
    await chatItem.trigger('click')
    expect(wrapper.emitted('open-chat-source')).toBeTruthy()
    expect(wrapper.emitted('open-chat-source')[0][0]).toEqual({
      date: '2026-06-27',
      messageId: 'msg-1'
    })

    // 观察来源 → open-observation
    const observationItem = wrapper.findAll('.sourceItem')[1]
    await observationItem.trigger('click')
    expect(wrapper.emitted('open-observation')).toBeTruthy()
    expect(wrapper.emitted('open-observation')[0][0]).toBe('obs-1')

    // 相关记忆 → open-memory
    const relatedItem = wrapper.find('.relatedPageItem')
    await relatedItem.trigger('click')
    expect(wrapper.emitted('open-memory')).toBeTruthy()
    expect(wrapper.emitted('open-memory')[0][0]).toBe('wiki-lobster')
  })
})
