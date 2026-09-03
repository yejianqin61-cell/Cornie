import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ConfirmCard, { type ConfirmRequest } from '../../src/renderer/components/chat/ConfirmCard'
import { renderWithProviders } from './helpers'

// 确认卡回归（移植自旧 confirm-card.test.mjs；门禁 verify-task137）。
// Vue 版以 emitted('confirm') 为契约，React 版以 onConfirm/onReject 回调为契约。

const baseRequest: ConfirmRequest = {
  title: '记一笔支出？',
  reason: '需要你确认后继续',
  payload: { amount: 42, categoryName: '餐饮' },
}

describe('ConfirmCard', () => {
  it('pending：标题/原因/payload 明细上屏，同意与拒绝可用', () => {
    const onConfirm = vi.fn()
    const onReject = vi.fn()
    renderWithProviders(
      <ConfirmCard request={baseRequest} status="pending" onConfirm={onConfirm} onReject={onReject} />
    )

    expect(screen.getByText('记一笔支出？')).toBeTruthy()
    expect(screen.getByText('需要你确认后继续')).toBeTruthy()
    expect(screen.getByText(/amount：42/)).toBeTruthy()
    expect(screen.getByText(/categoryName：餐饮/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '同意' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith(baseRequest)

    fireEvent.click(screen.getByRole('button', { name: '先不要' }))
    expect(onReject).toHaveBeenCalledTimes(1)
  })

  it('状态徽标语义：approved/rejected/failed/processing/pending', () => {
    const { rerender } = renderWithProviders(<ConfirmCard request={baseRequest} status="pending" />)
    expect(screen.getByText('待确认')).toBeTruthy()

    rerender(<ConfirmCard request={baseRequest} status="approved" />)
    expect(screen.getByText('已同意')).toBeTruthy()
    expect((screen.getByRole('button', { name: '同意' }) as HTMLButtonElement).disabled).toBe(true)

    rerender(<ConfirmCard request={baseRequest} status="rejected" />)
    expect(screen.getByText('已拒绝')).toBeTruthy()

    rerender(<ConfirmCard request={baseRequest} status="failed" errorMessage="执行失败，请稍后再试" />)
    expect(screen.getByText('执行失败')).toBeTruthy()
    expect(screen.getByText('执行失败，请稍后再试')).toBeTruthy()

    // processing：徽标与主按钮同文案 → 两处匹配
    rerender(<ConfirmCard request={baseRequest} status="processing" />)
    expect(screen.getAllByText('处理中').length).toBe(2)
    expect((screen.getByRole('button', { name: '处理中' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('多态 request：类目创建/映射专有形状 + tool_name/snake、toolName/camel 双容忍', () => {
    const creation: ConfirmRequest = {
      kind: 'category_creation_confirmation',
      domain: 'ledger',
      proposedCategoryName: '游戏充值',
      tool_name: 'ledger_category.create',
    }
    const { unmount } = renderWithProviders(<ConfirmCard request={creation} status="pending" />)
    expect(screen.getByText('确认新建这个类目')).toBeTruthy()
    expect(screen.getByText(/所属领域：ledger/)).toBeTruthy()
    expect(screen.getByText(/建议类目：游戏充值/)).toBeTruthy()
    expect(screen.getByText(/触发动作：ledger_category.create/)).toBeTruthy()
    unmount()

    const mapping: ConfirmRequest = {
      kind: 'category_mapping_confirmation',
      domain: 'ledger',
      recommendedCategory: { name: '餐饮' },
      similarCandidates: [{ name: '吃饭' }, { name: '买菜' }],
      toolName: 'ledger.create_expense_entry',
    }
    renderWithProviders(<ConfirmCard request={mapping} status="pending" />)
    expect(screen.getByText('确认改用这个类目')).toBeTruthy()
    expect(screen.getByText(/推荐类目：餐饮/)).toBeTruthy()
    expect(screen.getByText(/可选候选：吃饭、买菜/)).toBeTruthy()
    expect(screen.getByText(/触发动作：ledger.create_expense_entry/)).toBeTruthy()
  })

  it('缺省 request → 兜底标题（眉题与标题同为兜底文案，共两处）', () => {
    renderWithProviders(<ConfirmCard request={{}} status="pending" />)
    expect(screen.getAllByText('需要你确认').length).toBe(2)
  })
})
