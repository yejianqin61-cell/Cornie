import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ConfirmCard from '../../src/renderer/components/ConfirmCard.vue'

describe('ConfirmCard', () => {
  it('renders category creation confirmation details and emits actions', async () => {
    const request = {
      kind: 'category_creation_confirmation',
      domain: 'ledger',
      proposedCategoryName: '龙虾聚餐',
      pendingAction: {
        toolName: 'ledger.createExpenseEntry'
      },
      reason: '当前没有合适的支出类目，需要你先点头。'
    }

    const wrapper = mount(ConfirmCard, {
      props: {
        request,
        status: 'pending'
      }
    })

    expect(wrapper.text()).toContain('需要确认：新增类目')
    expect(wrapper.text()).toContain('所属域：ledger')
    expect(wrapper.text()).toContain('建议类目：龙虾聚餐')

    await wrapper.get('.confirmBtnPrimary').trigger('click')
    await wrapper.get('.confirmBtn:not(.confirmBtnPrimary)').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('reject')).toHaveLength(1)
    expect(wrapper.emitted('confirm')[0][0]).toEqual(request)
  })

  it('shows processing and failure states', () => {
    const wrapper = mount(ConfirmCard, {
      props: {
        request: {
          tool_name: 'memoryWiki.mergePages'
        },
        status: 'failed',
        errorMessage: '合并前校验没有通过。'
      }
    })

    expect(wrapper.text()).toContain('处理失败，可以稍后重试。')
    expect(wrapper.text()).toContain('合并前校验没有通过。')
    expect(wrapper.get('.confirmBtnPrimary').attributes('disabled')).toBeDefined()
  })
})
