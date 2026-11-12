import { beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ScheduleList from './ScheduleList.vue'
import ScheduleEmptyState from './ScheduleEmptyState.vue'
import ScheduleForm from './ScheduleForm.vue'
import ScheduleHomePage from './ScheduleHomePage.vue'
import {
  createSchedule,
  listScheduleCategories,
  listSchedules,
  reorderScheduleCategory,
  restoreSchedule,
} from '../../api/schedule.js'

vi.mock('../../api/schedule.js', () => ({
  listSchedules: vi.fn(),
  createSchedule: vi.fn(),
  cancelSchedule: vi.fn(),
  restoreSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  listScheduleCategories: vi.fn(),
  createScheduleCategory: vi.fn(),
  updateScheduleCategory: vi.fn(),
  restoreScheduleCategory: vi.fn(),
  reorderScheduleCategory: vi.fn(),
}))

describe('ScheduleList', () => {
  const items = [
    { id: '1', title: '会议', startAt: '2026-09-16T10:00:00', status: 'scheduled' },
    { id: '2', title: '已取消', startAt: '2026-09-16T14:00:00', status: 'cancelled' },
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

  it('emits restore for a cancelled item from the service status', async () => {
    const wrapper = mount(ScheduleList, {
      props: { items: [{ id: '2', title: '已取消', startAt: '2026-09-16T14:00:00', status: 'cancelled' }] },
    })
    const buttons = wrapper.findAllComponents({ name: 'Button' })
    await buttons[0].trigger('click')
    expect(wrapper.emitted('restore')).toEqual([['2']])
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

describe('ScheduleHomePage write failures', () => {
  beforeEach(() => {
    listSchedules.mockResolvedValue({
      items: [{ id: '2', title: '已取消', startAt: '2026-09-16T14:00:00', status: 'cancelled' }],
    })
    listScheduleCategories.mockResolvedValue({ items: [] })
    restoreSchedule.mockReset()
  })

  it('shows a retry when restore fails', async () => {
    restoreSchedule.mockRejectedValueOnce(new Error('恢复失败'))
    const wrapper = mount(ScheduleHomePage)
    await flushPromises()

    await wrapper.findComponent(ScheduleList).vm.$emit('restore', '2')
    await flushPromises()

    expect(wrapper.text()).toContain('恢复失败')
    expect(wrapper.text()).toContain('重试')
  })
})

describe('ScheduleList category tag', () => {
  it('shows the category name when present', () => {
    const wrapper = mount(ScheduleList, {
      props: {
        items: [{ id: '1', title: '会议', startAt: '2026-09-16T10:00:00', status: 'scheduled', categoryName: '工作' }],
      },
    })
    expect(wrapper.text()).toContain('工作')
  })
})

describe('ScheduleForm category select', () => {
  const categories = [{ id: 'cat_work', name: '工作', isActive: true }]

  it('adds the chosen category to the create payload', async () => {
    const wrapper = mount(ScheduleForm, { props: { categories } })
    await wrapper.get('[data-testid="schedule-category-select"]').setValue('cat_work')
    const inputs = wrapper.findAllComponents({ name: 'Input' })
    await inputs[0].setValue('周会')
    await inputs[1].setValue('2026-09-16T10:00')
    await wrapper.findComponent({ name: 'Button' }).trigger('click')
    expect(wrapper.emitted('create')[0][0]).toEqual({
      title: '周会',
      startAt: '2026-09-16T10:00',
      categoryId: 'cat_work',
      categoryName: '工作',
    })
  })
})

describe('ScheduleHomePage categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listSchedules.mockResolvedValue({ items: [] })
    listScheduleCategories.mockResolvedValue({
      items: [
        { id: 'cat_a', name: '工作', isActive: true, sortOrder: 1 },
        { id: 'cat_b', name: '生活', isActive: true, sortOrder: 2 },
      ],
    })
    createSchedule.mockResolvedValue({ entry: {} })
    reorderScheduleCategory.mockResolvedValue({ category: {} })
  })

  it('swaps the order of two categories', async () => {
    const wrapper = mount(ScheduleHomePage)
    await flushPromises()
    await wrapper.vm.openCategories()

    await wrapper.vm.moveCategory({ id: 'cat_b', direction: 'up' })

    expect(reorderScheduleCategory).toHaveBeenCalledWith('cat_b', 1)
    expect(reorderScheduleCategory).toHaveBeenCalledWith('cat_a', 2)
  })

  it('sends the selected category with a new schedule', async () => {
    const wrapper = mount(ScheduleHomePage)
    await flushPromises()

    await wrapper.vm.onCreate({ title: '周会', startAt: '2026-09-16T10:00', categoryId: 'cat_a', categoryName: '工作' })

    expect(createSchedule).toHaveBeenCalledWith({
      title: '周会',
      startAt: '2026-09-16T10:00',
      categoryId: 'cat_a',
      categoryName: '工作',
    })
  })
})
