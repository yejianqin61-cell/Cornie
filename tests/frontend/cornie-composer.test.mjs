import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const blinkNowMock = vi.fn(async () => {})
const startMock = vi.fn()
const stopMock = vi.fn()

vi.mock('../../src/renderer/cornieBlink', () => ({
  createCornieBlinkController: vi.fn(() => ({
    blinkNow: blinkNowMock,
    start: startMock,
    stop: stopMock
  }))
}))

import CornieComposer from '../../src/renderer/CornieComposer.vue'

function dispatchPointerEvent(element, type, { clientX, clientY, pointerId }) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY
  })

  Object.defineProperty(event, 'pointerId', { value: pointerId })

  element.dispatchEvent(event)
}

describe('CornieComposer', () => {
  beforeEach(() => {
    blinkNowMock.mockClear()
    startMock.mockClear()
    stopMock.mockClear()

    globalThis.navigator = {
      clipboard: {
        writeText: vi.fn(async () => {})
      }
    }
  })

  it('renders editor shell and exports json payload', async () => {
    const wrapper = mount(CornieComposer)

    expect(wrapper.text()).toContain('Cornie 拼装编辑器')
    expect(wrapper.text()).toContain('眨眼覆盖层（挂在头部）')

    const textarea = wrapper.get('textarea.mono')
    expect(textarea.element.value).toContain('"version": 1')

    const copyJsonButton = wrapper.findAll('button').find((button) => button.text() === '复制 JSON')
    await copyJsonButton.trigger('click')

    expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"eyeOverlay"')
    )
  })

  it('toggles checkerboard, previews blink, and switches random blink loop', async () => {
    const wrapper = mount(CornieComposer)

    const canvas = wrapper.get('.canvas')
    expect(canvas.classes()).toContain('checker')

    const checkbox = wrapper.get('input[type="checkbox"]')
    await checkbox.setValue(false)
    expect(canvas.classes()).not.toContain('checker')

    const previewButton = wrapper.findAll('button').find((button) => button.text() === '眨眼预览')
    await previewButton.trigger('click')
    expect(blinkNowMock).toHaveBeenCalledTimes(1)

    const toggleButton = wrapper.findAll('button').find((button) => button.text() === '开启随机眨眼')
    await toggleButton.trigger('click')
    expect(startMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('关闭随机眨眼')

    const toggleOffButton = wrapper.findAll('button').find((button) => button.text() === '关闭随机眨眼')
    await toggleOffButton.trigger('click')
    expect(stopMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('开启随机眨眼')
  })

  it('updates overlay position and size through pointer interactions', async () => {
    const wrapper = mount(CornieComposer)
    const before = JSON.parse(wrapper.get('textarea.mono').element.value)

    const overlay = wrapper.get('.eyeGroup').element
    dispatchPointerEvent(overlay, 'pointerdown', {
      clientX: 100,
      clientY: 120,
      pointerId: 1
    })
    dispatchPointerEvent(overlay, 'pointermove', {
      clientX: 118,
      clientY: 147,
      pointerId: 1
    })
    dispatchPointerEvent(overlay, 'pointerup', {
      clientX: 118,
      clientY: 147,
      pointerId: 1
    })
    await nextTick()

    const resizeHandle = wrapper.get('.eyeHandle').element
    dispatchPointerEvent(resizeHandle, 'pointerdown', {
      clientX: 160,
      clientY: 200,
      pointerId: 2
    })
    dispatchPointerEvent(resizeHandle, 'pointermove', {
      clientX: 185,
      clientY: 218,
      pointerId: 2
    })
    dispatchPointerEvent(resizeHandle, 'pointerup', {
      clientX: 185,
      clientY: 218,
      pointerId: 2
    })
    await nextTick()

    const exported = JSON.parse(wrapper.get('textarea.mono').element.value)
    expect(exported.eyeOverlay.x).toBe(before.eyeOverlay.x + 18)
    expect(exported.eyeOverlay.y).toBe(before.eyeOverlay.y + 27)
    expect(exported.eyeOverlay.w).toBe(before.eyeOverlay.w + 25)
    expect(exported.eyeOverlay.h).toBe(before.eyeOverlay.h + 18)
  })

  it('updates exported payload from manual inputs and supports css export copy', async () => {
    const wrapper = mount(CornieComposer)

    const numberInputs = wrapper.findAll('input[type="number"]')
    await numberInputs[0].setValue('150')
    await numberInputs[1].setValue('175')
    await numberInputs[2].setValue('96')
    await numberInputs[3].setValue('72')

    const rangeInputs = wrapper.findAll('input[type="range"]')
    await rangeInputs[0].setValue('12.5')
    await rangeInputs[1].setValue('0.45')

    const exported = wrapper.get('textarea.mono').element.value
    expect(exported).toContain('"x": 150')
    expect(exported).toContain('"y": 175')
    expect(exported).toContain('"w": 96')
    expect(exported).toContain('"h": 72')
    expect(exported).toContain('"rot": 12.5')
    expect(exported).toContain('"opacity": 0.45')

    const copyCssButton = wrapper.findAll('button').find((button) => button.text() === '复制 CSS 变量')
    await copyCssButton.trigger('click')

    expect(globalThis.navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      expect.stringContaining('--head-x:')
    )
  })
})
