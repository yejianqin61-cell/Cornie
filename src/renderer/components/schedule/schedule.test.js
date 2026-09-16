import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScheduleList from './ScheduleList.vue'
import ScheduleEmptyState from './ScheduleEmptyState.vue'
import ScheduleForm from './ScheduleForm.vue'

describe('ScheduleList', () => {
  const items = [
    { id: '1', title: '会议', startAt: '2026-09-16T10:00:00' },
    { id: '2', title: '已取消', startAt: '2026-09-16T14:00:00', cancelledAt: '2026-09-16' },
  ]

  it('renders items with times', () => {
    const wrapper = mount(ScheduleList, { props: { items } })
    expect(wrapper.text()).toContain('会议')
    expect(wrapper.text()).toContain('已取消')
  })

  it('emits cancel for active item', async () => {
    const wrapper = mount(ScheduleList, { props: { items } })
    const buttons = wrapper.findAllComponents({ name: 'Button' })
    const firstIcon = buttons[0]
    await firstIcon.trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})

describe('ScheduleEmptyState', () => {
  it('renders empty message', () => {
    const wrapper = mount(ScheduleEmptyState)
    expect(wrapper.text()).toContain('暂无日程安排')
  })
})

describe('ScheduleForm', () => {
  it('emits create with title and startAt', async () => {
    const wrapper = mount(ScheduleForm)
    const inputs = wrapper.findAllComponents({ name: 'Input' })
    await inputs[0].setValue('日程标题')
    await inputs[1].setValue('2026-09-16T10:00')
    await wrapper.findComponent({ name: 'Button' }).trigger('click')
    expect(wrapper.emitted('create')).toBeTruthy()
    expect(wrapper.emitted('create')[0][0]).toEqual({
      title: '日程标题',
      startAt: '2026-09-16T10:00',
    })
  })

  it('shows submitting state', () => {
    const wrapper = mount(ScheduleForm, { props: { submitting: true } })
    expect(wrapper.text()).toContain('添加中')
  })
})