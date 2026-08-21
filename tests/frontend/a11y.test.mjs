import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/renderer/api', () => ({
  listEntries: vi.fn(),
  getEntry: vi.fn(),
  listMemoryWikiPages: vi.fn(),
  listObservations: vi.fn()
}))

import * as api from '../../src/renderer/api'
import CornieDiaryMarkdown from '../../src/renderer/components/CornieDiaryMarkdown.vue'
import CornieDiaryReview from '../../src/renderer/components/CornieDiaryReview.vue'
import ObserveMemoryHome from '../../src/renderer/components/ObserveMemoryHome.vue'

beforeEach(() => {
  vi.clearAllMocks()
  api.listEntries.mockResolvedValue({ entries: [] })
  api.getEntry.mockResolvedValue({ entry: { cornieText: '' } })
  api.listMemoryWikiPages.mockResolvedValue({ items: [] })
  api.listObservations.mockResolvedValue({ observations: [] })
})

describe('FE-10 可访问性', () => {
  it('CornieDiaryMarkdown 默认渲染标题，headingLevel=0 时降级为 div（无 h1-h3）', () => {
    const content = '# 大标题\n\n## 小标题\n\n正文段落'

    const normal = mount(CornieDiaryMarkdown, { props: { content } })
    expect(normal.findAll('h1').length).toBe(1)
    expect(normal.findAll('h2').length).toBe(1)

    const flat = mount(CornieDiaryMarkdown, { props: { content, headingLevel: 0 } })
    expect(flat.findAll('h1').length).toBe(0)
    expect(flat.findAll('h2').length).toBe(0)
    expect(flat.findAll('h3').length).toBe(0)
    expect(flat.findAll('.mdHeadingFlat').length).toBe(2)
    expect(flat.text()).toContain('大标题')
    expect(flat.text()).toContain('小标题')
  })

  it('CornieDiaryReview 日记卡片按钮内不再渲染标题级元素', async () => {
    api.listEntries.mockResolvedValue({
      entries: [
        { date: '2026-08-21', hasCornieText: true, cornieText: '# 今天的标题\n\n内容' }
      ]
    })
    const wrapper = mount(CornieDiaryReview)
    await flushPromises()

    const buttons = wrapper.findAll('button.reviewCard')
    expect(buttons.length).toBeGreaterThan(0)
    for (const btn of buttons) {
      expect(btn.findAll('h1, h2, h3').length).toBe(0)
    }
    expect(wrapper.find('.reviewExcerpt').text()).toContain('今天的标题')
    wrapper.unmount()
  })

  it('ObserveMemoryHome 无 a[href="#"] 死链（聊天入口为按钮）', async () => {
    const wrapper = mount(ObserveMemoryHome)
    await flushPromises()
    expect(wrapper.findAll('a[href="#"]').length).toBe(0)
    const chatLink = wrapper.findAll('button').find((b) => b.text() === '聊天')
    expect(chatLink).toBeDefined()
    wrapper.unmount()
  })
})
