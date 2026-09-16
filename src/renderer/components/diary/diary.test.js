import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DiaryCalendarMonth from './DiaryCalendarMonth.vue'
import DiaryCard from './DiaryCard.vue'
import CornieDiaryView from './CornieDiaryView.vue'
import UserDiaryEditor from './UserDiaryEditor.vue'
import OnThisDayCard from './OnThisDayCard.vue'
import DiaryEmptyState from './DiaryEmptyState.vue'
import DiaryRegenerateBtn from './DiaryRegenerateBtn.vue'

describe('DiaryCalendarMonth', () => {
  const defaultProps = { entries: [], selectedDate: '', year: 2026, month: 9 }

  it('renders month title', () => {
    const wrapper = mount(DiaryCalendarMonth, { props: defaultProps })
    expect(wrapper.text()).toContain('2026年')
    expect(wrapper.text()).toContain('9月')
  })

  it('renders weekday headers', () => {
    const wrapper = mount(DiaryCalendarMonth, { props: defaultProps })
    expect(wrapper.text()).toContain('一')
    expect(wrapper.text()).toContain('日')
  })

  it('emits select when clicking a day', async () => {
    const wrapper = mount(DiaryCalendarMonth, { props: defaultProps })
    const days = wrapper.findAll('.diary-cal-day:not(.diary-cal-day--pad)')
    if (days.length > 0) {
      await days[0].trigger('click')
      expect(wrapper.emitted('select')).toBeTruthy()
    }
  })

  it('emits prevMonth / nextMonth', async () => {
    const wrapper = mount(DiaryCalendarMonth, { props: defaultProps })
    const btns = wrapper.findAllComponents({ name: 'Button' })
    await btns[0].trigger('click')
    expect(wrapper.emitted('prevMonth')).toBeTruthy()
    await btns[1].trigger('click')
    expect(wrapper.emitted('nextMonth')).toBeTruthy()
  })

  it('marks entries with dots', () => {
    const wrapper = mount(DiaryCalendarMonth, {
      props: { ...defaultProps, entries: [{ date: '2026-09-15' }], selectedDate: '2026-09-15' },
    })
    expect(wrapper.find('.diary-cal-day--has-entry').exists()).toBe(true)
  })
})

describe('CornieDiaryView', () => {
  it('renders text content', () => {
    const wrapper = mount(CornieDiaryView, { props: { text: '今天天气很好' } })
    expect(wrapper.text()).toContain('今天天气很好')
  })
})

describe('UserDiaryEditor', () => {
  it('renders textarea with initial text', () => {
    const wrapper = mount(UserDiaryEditor, { props: { text: '初始内容', date: '2026-09-16' } })
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toBe('初始内容')
  })

  it('shows save button when text changes', async () => {
    const wrapper = mount(UserDiaryEditor, { props: { text: '', date: '2026-09-16' } })
    expect(wrapper.find('.user-diary-actions').exists()).toBe(false)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('新内容')
    expect(wrapper.find('.user-diary-actions').exists()).toBe(true)
  })

  it('emits save', async () => {
    const wrapper = mount(UserDiaryEditor, { props: { text: '', date: '2026-09-16' } })
    await wrapper.find('textarea').setValue('保存我')
    await wrapper.findComponent({ name: 'Button' }).trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0][0]).toBe('保存我')
  })
})

describe('OnThisDayCard', () => {
  it('renders year and preview', () => {
    const wrapper = mount(OnThisDayCard, {
      props: { item: { year: 2025, userText: '去年今日的内容' } },
    })
    expect(wrapper.text()).toContain('2025年')
    expect(wrapper.text()).toContain('去年今日的内容')
  })
})

describe('DiaryEmptyState', () => {
  it('renders empty message', () => {
    const wrapper = mount(DiaryEmptyState)
    expect(wrapper.text()).toContain('还没有日记')
  })
})

describe('DiaryRegenerateBtn', () => {
  it('emits regenerate', async () => {
    const wrapper = mount(DiaryRegenerateBtn, { props: { date: '2026-09-16' } })
    await wrapper.findComponent({ name: 'Button' }).trigger('click')
    expect(wrapper.emitted('regenerate')).toBeTruthy()
  })
})

describe('DiaryCard', () => {
  it('renders UserDiaryEditor and CornieDiaryView', () => {
    const wrapper = mount(DiaryCard, {
      props: { entry: { userText: '用户', cornieText: 'Cornie' }, date: '2026-09-16' },
    })
    expect(wrapper.findComponent(UserDiaryEditor).exists()).toBe(true)
    expect(wrapper.findComponent(CornieDiaryView).exists()).toBe(true)
  })

  it('shows placeholder when no cornieText', () => {
    const wrapper = mount(DiaryCard, {
      props: { entry: { userText: '用户' }, date: '2026-09-16' },
    })
    expect(wrapper.text()).toContain('还未写日记')
  })
})