import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import CornieComposer from '../../src/renderer/CornieComposer.vue'

describe('CornieComposer', () => {
  beforeEach(() => {
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

    const buttons = wrapper.findAll('button')
    const copyJsonButton = buttons.find((button) => button.text() === '复制 JSON')
    await copyJsonButton.trigger('click')

    expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalled()
  })
})
