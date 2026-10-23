import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageBody from './MessageBody.vue'

describe('MessageBody', () => {
  it('renders blank-line separated paragraphs', () => {
    const wrapper = mount(MessageBody, { props: { text: '第一段\n\n第二段' } })

    const paragraphs = wrapper.findAll('.msg-body-p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0].text()).toBe('第一段')
    expect(paragraphs[1].text()).toBe('第二段')
  })

  it('keeps single line breaks inside a paragraph', () => {
    const wrapper = mount(MessageBody, { props: { text: '第一行\n第二行' } })

    expect(wrapper.find('.msg-body-p').text()).toContain('第一行\n第二行')
  })

  it('renders fenced code as pre without fence markers', () => {
    const wrapper = mount(MessageBody, { props: { text: '看这里：\n```js\nconst a = 1\n```\n结束' } })

    const codes = wrapper.findAll('pre.msg-body-code')
    expect(codes).toHaveLength(1)
    expect(codes[0].text()).toContain('const a = 1')
    expect(wrapper.text()).not.toContain('```')
  })

  it('renders consecutive dash lines as a list', () => {
    const wrapper = mount(MessageBody, { props: { text: '- 房租\n- 电费' } })

    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.find('ul').exists()).toBe(true)
  })

  it('renders bold markers as strong without leaking asterisks', () => {
    const wrapper = mount(MessageBody, { props: { text: '这是**重点**内容' } })

    expect(wrapper.find('strong').text()).toBe('重点')
    expect(wrapper.text()).not.toContain('**')
  })
})
