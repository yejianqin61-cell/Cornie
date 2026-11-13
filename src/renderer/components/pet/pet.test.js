import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CorneApp from './CorneApp.vue'
import { listTodos } from '../../api/todo.js'

vi.mock('../../api/todo.js', () => ({ listTodos: vi.fn() }))
import CornieBubble from './CornieBubble.vue'
import PetSettings from './PetSettings.vue'

describe('CornieBubble', () => {
  it('renders bubble text', () => {
    const wrapper = mount(CornieBubble, {
      props: { text: '该喝水了' },
    })
    expect(wrapper.text()).toContain('该喝水了')
  })

  it('has bubble class', () => {
    const wrapper = mount(CornieBubble, {
      props: { text: '测试' },
    })
    expect(wrapper.find('.cornie-bubble').exists()).toBe(true)
  })
})

describe('PetSettings', () => {
  it('renders scale options', () => {
    const wrapper = mount(PetSettings, {
      props: { scale: 1, alwaysOnTop: false },
    })
    expect(wrapper.text()).toContain('大小')
    expect(wrapper.text()).toContain('置顶')
  })

  it('highlights active scale', () => {
    const wrapper = mount(PetSettings, {
      props: { scale: 0.8, alwaysOnTop: false },
    })
    const scales = wrapper.findAll('.pet-settings-scale')
    const active = scales.find((s) => s.classes().includes('active'))
    expect(active.text()).toBe('0.8x')
  })

  it('emits scale-change on click', async () => {
    const wrapper = mount(PetSettings, {
      props: { scale: 1, alwaysOnTop: false },
    })
    await wrapper.findAll('.pet-settings-scale')[0].trigger('click')
    expect(wrapper.emitted('scale-change')).toBeTruthy()
  })

  it('emits toggle-always-on-top', async () => {
    const wrapper = mount(PetSettings, {
      props: { scale: 1, alwaysOnTop: false },
    })
    await wrapper.find('.pet-settings-toggle-btn').trigger('click')
    expect(wrapper.emitted('toggle-always-on-top')).toBeTruthy()
  })

  it('toggles shows correct state', () => {
    const wrapper = mount(PetSettings, {
      props: { scale: 1, alwaysOnTop: true },
    })
    expect(wrapper.find('.pet-settings-toggle-btn.on').exists()).toBe(true)
  })
})

describe('CorneApp todo count', () => {
  afterEach(() => {
    delete window.cornieDesktop
    vi.clearAllMocks()
  })

  function fakeBridge() {
    const handlers = []
    window.cornieDesktop = {
      getAlwaysOnTop: async () => false,
      onDataChanged: (h) => {
        handlers.push(h)
        return () => {}
      },
    }
    return handlers
  }

  it('shows the open todo count', async () => {
    fakeBridge()
    listTodos.mockResolvedValue({ items: [{}, {}, {}] })
    const wrapper = mount(CorneApp)
    await flushPromises()
    expect(wrapper.find('[data-testid="pet-todo-count"]').text()).toBe('3')
    wrapper.unmount()
  })

  it('refreshes on todo change and hides at zero', async () => {
    const handlers = fakeBridge()
    listTodos.mockResolvedValue({ items: [{}, {}, {}] })
    const wrapper = mount(CorneApp)
    await flushPromises()
    listTodos.mockResolvedValue({ items: [{}, {}, {}, {}] })
    handlers[0]({ domain: 'todo' })
    await flushPromises()
    expect(wrapper.find('[data-testid="pet-todo-count"]').text()).toBe('4')
    listTodos.mockResolvedValue({ items: [] })
    handlers[0]({ domain: 'todo' })
    await flushPromises()
    expect(wrapper.find('[data-testid="pet-todo-count"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('CorneApp reminder bubble', () => {
  afterEach(() => {
    delete window.cornieDesktop
  })

  it('shows the reminder as a bubble', async () => {
    let emit
    window.cornieDesktop = {
      getAlwaysOnTop: async () => false,
      onDataChanged: () => () => {},
      onReminder: (h) => ((emit = h), () => {}),
    }
    listTodos.mockResolvedValue({ items: [] })
    const wrapper = mount(CorneApp)
    await flushPromises()
    emit({ title: '日程提醒', body: '周会' })
    await flushPromises()
    expect(wrapper.find('.cornie-bubble').text()).toBe('日程提醒：周会')
    wrapper.unmount()
  })
})
