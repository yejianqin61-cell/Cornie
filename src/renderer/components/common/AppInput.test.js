import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AppInput from './AppInput.vue'

function mountBound(initial = '', attrs = {}) {
  const value = ref(initial)
  const wrapper = mount({
    components: { AppInput },
    setup: () => ({ value, attrs }),
    template: '<AppInput v-model="value" v-bind="attrs" />',
  })
  return { wrapper, value }
}

describe('AppInput', () => {
  it('writes native typing back to the bound value', async () => {
    const { wrapper, value } = mountBound()
    await wrapper.get('input').setValue('手输的内容')
    expect(value.value).toBe('手输的内容')
  })

  it('shows the bound value in the input', () => {
    const { wrapper } = mountBound('已有内容')
    expect(wrapper.get('input').element.value).toBe('已有内容')
  })

  it('passes placeholder, type and disabled through to the input', () => {
    const { wrapper } = mountBound('', { placeholder: '搜索...', type: 'datetime-local', disabled: true })
    const input = wrapper.get('input')
    expect(input.attributes('placeholder')).toBe('搜索...')
    expect(input.attributes('type')).toBe('datetime-local')
    expect(input.attributes('disabled')).toBeDefined()
  })
})
