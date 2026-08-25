import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import UiButton from '../../src/renderer/components/ui/UiButton.vue'
import UiCard from '../../src/renderer/components/ui/UiCard.vue'
import UiEmpty from '../../src/renderer/components/ui/UiEmpty.vue'
import UiBadge from '../../src/renderer/components/ui/UiBadge.vue'
import UiDialog from '../../src/renderer/components/ui/UiDialog.vue'

describe('UiButton', () => {
  it('renders default variant with accent token class and emits click', async () => {
    const wrapper = mount(UiButton, { slots: { default: '保存' } })
    expect(wrapper.text()).toBe('保存')
    expect(wrapper.classes()).toContain('bg-(--color-accent)')
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('renders destructive / ghost / link variants', () => {
    const destructive = mount(UiButton, { props: { variant: 'destructive' } })
    expect(destructive.classes()).toContain('bg-(--color-danger)')
    const ghost = mount(UiButton, { props: { variant: 'ghost' } })
    expect(ghost.classes()).toContain('bg-transparent')
    const link = mount(UiButton, { props: { variant: 'link' } })
    expect(link.classes()).toContain('underline-offset-4')
  })
})

describe('UiCard', () => {
  it('renders title, subhint and default slot', () => {
    const wrapper = mount(UiCard, {
      props: { title: '治理详情', subhint: '只读信息' },
      slots: { default: '<div class="inner">正文</div>' }
    })
    expect(wrapper.text()).toContain('治理详情')
    expect(wrapper.text()).toContain('只读信息')
    expect(wrapper.find('.inner').text()).toBe('正文')
  })

  it('renders head and actions slots when provided', () => {
    const wrapper = mount(UiCard, {
      slots: {
        head: '<div class="customHead">自定义头</div>',
        actions: '<button class="actBtn">过滤</button>',
        default: '内容'
      }
    })
    expect(wrapper.find('.customHead').text()).toBe('自定义头')
    expect(wrapper.find('.actBtn').exists()).toBe(true)
  })
})

describe('UiEmpty', () => {
  it('renders icon and text, plus action slot', () => {
    const wrapper = mount(UiEmpty, {
      props: { icon: '📖', text: '还没有记忆' },
      slots: { action: '<button class="newBtn">新建</button>' }
    })
    expect(wrapper.text()).toContain('📖')
    expect(wrapper.text()).toContain('还没有记忆')
    expect(wrapper.find('.newBtn').exists()).toBe(true)
  })
})

describe('UiBadge', () => {
  it('renders destructive badge with soft danger classes', () => {
    const wrapper = mount(UiBadge, { props: { variant: 'destructive' }, slots: { default: 'pending' } })
    expect(wrapper.text()).toBe('pending')
    expect(wrapper.classes()).toContain('bg-(--color-danger-soft)')
  })
})

describe('UiDialog', () => {
  it('renders title/description/content when open and emits close via close button', async () => {
    const wrapper = mount(UiDialog, {
      props: { open: true, title: '确认删除', description: '此操作不可撤销' },
      slots: { default: '<button class="innerBtn">确定</button>' }
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('确认删除')
    expect(bodyText).toContain('此操作不可撤销')

    const closeBtns = document.querySelectorAll('button[aria-label="关闭"]')
    expect(closeBtns.length).toBeGreaterThan(0)
    closeBtns[0].click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')[0]).toEqual([false])
    wrapper.unmount()
  })
})
