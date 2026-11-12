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
  updateSchedule,
} from '../../api/schedule.js'

vi.mock('../../api/schedule.js', () => ({
  listSchedules: vi.fn(),
  createSchedule: vi.fn(),
  cancelSchedule: vi.fn(),
  restoreSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  updateSchedule: vi.fn(),
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
    const inputs = wrapper.findAll('input')
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
    const inputs = wrapper.findAll('input')
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

describe('ScheduleList editing', () => {
  const items = [
    { id: '1', title: '会议', startAt: '2026-09-16T10:00:00', status: 'scheduled', location: '三楼' },
    { id: '2', title: '已取消', startAt: '2026-09-16T14:00:00', status: 'cancelled' },
  ]

  it('offers the edit button only for scheduled items', () => {
    const wrapper = mount(ScheduleList, { props: { items } })
    expect(wrapper.findAll('[data-testid="schedule-edit"]')).toHaveLength(1)
  })

  it('emits edit with the whole item and shows the location', async () => {
    const wrapper = mount(ScheduleList, { props: { items } })
    expect(wrapper.text()).toContain('三楼')
    await wrapper.get('[data-testid="schedule-edit"]').trigger('click')
    expect(wrapper.emitted('edit')[0]).toEqual([items[0]])
  })
})

describe('ScheduleForm edit mode', () => {
  const initial = { title: '会议', startAt: '2026-09-16T10:00:00', location: '三楼' }

  it('fills the fields and switches to save mode', () => {
    const wrapper = mount(ScheduleForm, { props: { initial } })
    const inputs = wrapper.findAll('input')
    expect(inputs).toHaveLength(3)
    expect(inputs[0].element.value).toBe('会议')
    expect(inputs[1].element.value).toBe('2026-09-16T10:00')
    expect(inputs[2].element.value).toBe('三楼')
    expect(wrapper.text()).toContain('保存')
    expect(wrapper.text()).not.toContain('添加')
  })

  it('emits update with the edited fields', async () => {
    const wrapper = mount(ScheduleForm, { props: { initial } })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('周会')
    await wrapper.findComponent({ name: 'Button' }).trigger('click')
    expect(wrapper.emitted('update')[0][0]).toEqual({
      title: '周会',
      startAt: '2026-09-16T10:00',
      location: '三楼',
    })
    expect(wrapper.emitted('create')).toBeUndefined()
  })

  it('keeps the create form unchanged without initial data', () => {
    const wrapper = mount(ScheduleForm)
    expect(wrapper.findAll('input')).toHaveLength(2)
    expect(wrapper.text()).toContain('添加')
  })
})

describe('ScheduleHomePage editing', () => {
  const item = { id: '1', title: '会议', startAt: '2026-09-16T10:00:00', status: 'scheduled', location: '三楼' }

  beforeEach(() => {
    vi.clearAllMocks()
    listSchedules.mockResolvedValue({ items: [item] })
    listScheduleCategories.mockResolvedValue({ items: [] })
    updateSchedule.mockResolvedValue({ entry: {} })
  })

  it('saves the edit, reloads the list and closes the form', async () => {
    const wrapper = mount(ScheduleHomePage)
    await flushPromises()
    wrapper.vm.startEdit(item)
    await flushPromises()
    listSchedules.mockClear()

    await wrapper.vm.onUpdate({ title: '周会', startAt: '2026-09-16T10:00', location: '三楼' })
    await flushPromises()

    expect(updateSchedule).toHaveBeenCalledTimes(1)
    expect(updateSchedule).toHaveBeenCalledWith('1', { title: '周会', startAt: '2026-09-16T10:00', location: '三楼' })
    expect(listSchedules).toHaveBeenCalled()
    expect(wrapper.vm.editing).toBeNull()
  })

  it('keeps the form and shows the error when saving fails', async () => {
    updateSchedule.mockRejectedValue(new Error('保存失败'))
    const wrapper = mount(ScheduleHomePage)
    await flushPromises()
    wrapper.vm.startEdit(item)

    await wrapper.vm.onUpdate({ title: '周会', startAt: '2026-09-16T10:00', location: '' })
    await flushPromises()

    expect(wrapper.text()).toContain('保存失败')
    expect(wrapper.vm.editing).not.toBeNull()
  })
})
