import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ChatHistoryPage from '../../src/renderer/pages/ChatHistoryPage'
import { renderWithProviders } from './helpers'

// 聊天记录页回归（移植自旧 chat-history.test.mjs；门禁 verify-task137）。
// 要求：加载失败呈现可读错误文案（'读取聊天记录失败'）、日期列表/消息渲染、
// 导出按钮禁用态、查看更多分页。

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('ChatHistoryPage', () => {
  it('正常渲染：日期列表 + 当日消息 + 分页按钮', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/chatlogs?')) {
        return jsonResponse({
          entries: [
            { date: '2026-02-14', messageCount: 3 },
            { date: '2026-02-13', messageCount: 5 },
          ],
          availableMonths: ['2026-02'],
          pagination: { cursor: '0', nextCursor: 'next-1', hasMore: true, pageSize: 60, total: 12 },
        })
      }
      if (url.match(/\/chatlogs\/\d{4}-\d{2}-\d{2}/)) {
        return jsonResponse({
          messages: [
            { id: 'm1', role: 'user', content: '早上好' },
            { id: 'm2', role: 'cornie', content: '早上好呀，今天想聊点什么？' },
          ],
          pagination: { cursor: '0', nextCursor: null, hasMore: false, pageSize: 80, total: 2 },
          searchMeta: { query: '', mode: 'browse' },
        })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<ChatHistoryPage />, { route: '/chat/history' })

    await waitFor(() => {
      // 日期同时出现在侧栏行与内容标题 → getAllByText
      expect(screen.getAllByText('2026-02-14').length).toBeGreaterThan(0)
    })
    await waitFor(() => {
      expect(screen.getByText('早上好')).toBeTruthy()
      expect(screen.getByText('早上好呀，今天想聊点什么？')).toBeTruthy()
    })
    // 分页：hasMore → 查看更多日期按钮
    expect(screen.getByText('查看更多日期')).toBeTruthy()
    // 导出本月 JSON 在未选月份时禁用
    expect((screen.getByRole('button', { name: '导出本月 JSON' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('消息加载失败：呈现可读错误文案', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/chatlogs?')) {
        return jsonResponse({ entries: [{ date: '2026-02-14', messageCount: 1 }], availableMonths: [], pagination: { cursor: '0', nextCursor: null, hasMore: false, pageSize: 100, total: 1 } })
      }
      return new Response(JSON.stringify({ error: '读取聊天记录失败' }), { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<ChatHistoryPage />, { route: '/chat/history' })
    await waitFor(() => {
      expect(screen.getByText('读取聊天记录失败')).toBeTruthy()
    })
  })

  it('空记录 → 引导文案', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ entries: [], availableMonths: [], pagination: { cursor: '0', nextCursor: null, hasMore: false, pageSize: 100, total: 0 } }))
    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<ChatHistoryPage />, { route: '/chat/history' })
    await waitFor(() => {
      expect(screen.getByText('这里还没有聊天记录')).toBeTruthy()
    })
  })
})
