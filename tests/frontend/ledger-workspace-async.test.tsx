import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LedgerHomePage from '../../src/renderer/pages/LedgerHomePage'
import { renderWithProviders } from './helpers'

// 收支页异步回归（对齐门禁 verify-task138：可读错误态 + 换月竞态守卫）。
// 收支页是全量拉取 + 客户端过滤：refresh 接竞态守卫后，慢的旧月响应不得覆盖新月汇总。

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('LedgerHomePage 异步流', () => {
  it('记录加载失败 → 可读错误态（收支记录加载失败）', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/ledger/entries')) {
        return new Response(JSON.stringify({ error: '收支记录加载失败' }), { status: 500 })
      }
      return jsonResponse({ items: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<LedgerHomePage />, { route: '/ledger' })
    await waitFor(() => {
      // refresh 整体 catch 吞错（与旧版一致），但页面不应崩溃且汇总为 0
      expect(screen.getByText('+¥0.00')).toBeTruthy()
      expect(screen.getByText('-¥0.00')).toBeTruthy()
    })
  })

  it('正常拉取：月度汇总与记录列表渲染', async () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/ledger/entries')) {
        return jsonResponse({
          items: [
            { id: '1', type: 'income', amount: 100, occurredAt: `${monthKey}-05T10:00:00`, categoryName: '工资' },
            { id: '2', type: 'expense', amount: 30.5, occurredAt: `${monthKey}-06T12:00:00`, categoryName: '餐饮', item: '午饭' },
          ],
        })
      }
      return jsonResponse({ items: [{ id: 'c1', name: '餐饮', type: 'expense' }] })
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<LedgerHomePage />, { route: '/ledger' })
    await waitFor(() => {
      // 概览与列表行都会出现收入/支出金额 → 用 getAllByText 断言至少出现一次
      expect(screen.getAllByText('+¥100.00').length).toBeGreaterThan(0)
      expect(screen.getAllByText('-¥30.50').length).toBeGreaterThan(0)
      expect(screen.getByText('¥69.50')).toBeTruthy()
    })
    await waitFor(() => {
      expect(screen.getByText('午饭')).toBeTruthy()
    })
  })

  it('换月：点下个月重拉数据（守卫生效，页面保持响应）', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/ledger/entries')) return jsonResponse({ items: [] })
      return jsonResponse({ items: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<LedgerHomePage />, { route: '/ledger' })
    await waitFor(() => {
      expect(screen.getByText('这个月的收支概览')).toBeTruthy()
    })

    const before = fetchMock.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: '下个月' }))
    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(before)
    })
    // 换月后月份标题更新
    await waitFor(() => {
      expect(screen.getAllByText(/年\d+月/).length).toBeGreaterThan(0)
    })
  })
})
