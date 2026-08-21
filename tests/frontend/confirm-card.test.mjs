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

    expect(wrapper.text()).toContain('铃湾想先和你确认一下这个新类目')
    expect(wrapper.text()).toContain('等你来决定')
    expect(wrapper.text()).toContain('所属领域：ledger')
    expect(wrapper.text()).toContain('建议类目：龙虾聚餐')
    expect(wrapper.text()).toContain('触发动作：ledger.createExpenseEntry')

    await wrapper.get('.confirmBtnPrimary').trigger('click')
    await wrapper.get('.confirmBtn:not(.confirmBtnPrimary)').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('reject')).toHaveLength(1)
    expect(wrapper.emitted('confirm')[0][0]).toEqual(request)
  })

  it('renders mapping confirmation candidates and recommended category', () => {
    const wrapper = mount(ConfirmCard, {
      props: {
        request: {
          kind: 'category_mapping_confirmation',
          domain: 'schedule',
          recommendedCategory: {
            name: '海鲜聚餐'
          },
          similarCandidates: [{ name: '龙虾大餐' }, { name: '朋友聚会' }],
          pendingAction: {
            toolName: 'schedule.createEvent'
          }
        },
        status: 'pending'
      }
    })

    expect(wrapper.text()).toContain('铃湾想先确认要不要改用这个类目')
    expect(wrapper.text()).toContain('等你来决定')
    expect(wrapper.text()).toContain('所属领域：schedule')
    expect(wrapper.text()).toContain('推荐类目：海鲜聚餐')
    expect(wrapper.text()).toContain('可选候选：龙虾大餐、朋友聚会')
    expect(wrapper.text()).toContain('触发动作：schedule.createEvent')
  })

  it('prefers explicit title and falls back to payload details', () => {
    const wrapper = mount(ConfirmCard, {
      props: {
        request: {
          title: '请确认写入长期记忆',
          reason: '这段信息看起来值得长期保留。',
          payload: {
            topic: '龙虾',
            importance: 'high'
          }
        },
        status: 'approved'
      }
    })

    expect(wrapper.text()).toContain('请确认写入长期记忆')
    expect(wrapper.text()).toContain('你已经同意啦')
    expect(wrapper.text()).toContain('topic：龙虾')
    expect(wrapper.text()).toContain('importance：high')
    expect(wrapper.text()).toContain('铃湾已经收到你的同意，正在继续做下去。')
    expect(wrapper.get('.confirmBtnPrimary').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.confirmBtn:not(.confirmBtnPrimary)').attributes('disabled')).toBeDefined()
  })

  it('supports tool_name, toolName, and default title branches', () => {
    const toolNameWrapper = mount(ConfirmCard, {
      props: {
        request: {
          tool_name: 'memoryWiki.mergePages'
        },
        status: 'failed',
        errorMessage: '合并前校验没有通过。'
      }
    })

    expect(toolNameWrapper.text()).toContain('这一步要不要继续处理 memoryWiki.mergePages？')
    expect(toolNameWrapper.text()).toContain('这次没继续成功')
    expect(toolNameWrapper.text()).toContain('继续处理的时候出了点小岔子，可以稍后再试。')
    expect(toolNameWrapper.text()).toContain('合并前校验没有通过。')

    const camelCaseWrapper = mount(ConfirmCard, {
      props: {
        request: {
          toolName: 'ledger.importMonthlyStatement',
          arguments: {
            month: '2026-06',
            source: 'bank'
          }
        },
        status: 'processing'
      }
    })

    expect(camelCaseWrapper.text()).toContain('这一步要不要继续处理 ledger.importMonthlyStatement？')
    expect(camelCaseWrapper.text()).toContain('铃湾正在继续处理')
    expect(camelCaseWrapper.text()).toContain('month：2026-06')
    expect(camelCaseWrapper.text()).toContain('source：bank')
    expect(camelCaseWrapper.text()).toContain('铃湾正在顺着你的选择继续处理...')
    expect(camelCaseWrapper.get('.confirmBtnPrimary').text()).toBe('处理中')
    expect(camelCaseWrapper.get('.confirmBtnPrimary').attributes('disabled')).toBeDefined()

    const fallbackWrapper = mount(ConfirmCard, {
      props: {
        request: {},
        status: 'rejected'
      }
    })

    expect(fallbackWrapper.text()).toContain('需要你点头')
    expect(fallbackWrapper.text()).toContain('这次先不做')
    expect(fallbackWrapper.text()).toContain('这件事继续做下去之前，铃湾想先征求你的同意。')
    expect(fallbackWrapper.text()).toContain('这次就先停在这里，不会继续执行。')
    expect(fallbackWrapper.find('.confirmDetails').exists()).toBe(false)
  })
})
