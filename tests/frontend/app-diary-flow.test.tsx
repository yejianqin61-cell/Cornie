import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DiaryEditorPage from '../../src/renderer/pages/DiaryEditorPage'
import { renderWithProviders } from './helpers'

// 日记编辑流回归（移植自旧 app-diary-flow.test.mjs；门禁 verify-task140）。
// 覆盖：保存失败分支、往年今日加载失败分支、regenerate-cornie 流程（含本地未保存
// userText 不被服务端响应覆盖的重写修复）。

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function todayKey() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function stubBackend(overrides: { failSave?: boolean; failOtd?: boolean } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init as RequestInit | undefined)?.method
    if (url.includes('/entries/') && url.includes('/regenerate-cornie')) {
      return jsonResponse({
        entry: { userText: '服务端旧内容', cornieText: '铃湾新写的一篇' },
      })
    }
    if (url.match(/\/entries\/\d{4}-\d{2}-\d{2}\/on-this-day/)) {
      if (overrides.failOtd) {
        return new Response(JSON.stringify({ error: '往年今日加载失败' }), { status: 500 })
      }
      return jsonResponse({ items: [{ date: '2025-02-14', userText: '去年今天', cornieText: '' }] })
    }
    if (url.includes('/entries?month=') || url.includes('/entries?')) {
      return jsonResponse({ entries: [] })
    }
    if (url.match(/\/entries\/\d{4}-\d{2}-\d{2}$/) && method === 'PUT') {
      if (overrides.failSave) {
        return new Response(JSON.stringify({ error: '保存日记失败' }), { status: 500 })
      }
      return jsonResponse({ entry: { userText: '我今天写了东西', cornieText: '' } })
    }
    if (url.match(/\/entries\/\d{4}-\d{2}-\d{2}$/)) {
      return jsonResponse({ entry: { userText: '', cornieText: '' } })
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('DiaryEditorPage 日记流', () => {
  it('编辑 + 保存：PUT 契约携带 userText/cornieText', async () => {
    const fetchMock = stubBackend()
    renderWithProviders(<DiaryEditorPage />, { route: '/diary/editor' })

    const textarea = await screen.findByPlaceholderText('今天发生了什么？写一点也行。')
    fireEvent.change(textarea, { target: { value: '我今天写了东西' } })

    const saveBtn = (await screen.findByRole('button', { name: '保存' })) as HTMLButtonElement
    await waitFor(() => expect(saveBtn.disabled).toBe(false))
    fireEvent.click(saveBtn)

    await waitFor(() => {
      const put = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PUT')
      expect(put).toBeTruthy()
      const body = JSON.parse(String((put?.[1] as RequestInit).body))
      expect(body.userText).toBe('我今天写了东西')
    })
    await waitFor(() => {
      expect(screen.getByText('已同步')).toBeTruthy()
    })
  })

  it('保存失败分支：可读错误文案（保存日记失败）', async () => {
    stubBackend({ failSave: true })
    renderWithProviders(<DiaryEditorPage />, { route: '/diary/editor' })

    const textarea = await screen.findByPlaceholderText('今天发生了什么？写一点也行。')
    fireEvent.change(textarea, { target: { value: '写点什么' } })
    fireEvent.click(await screen.findByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByText('保存日记失败')).toBeTruthy()
    })
  })

  it('往年今日加载失败分支：独立错误态（往年今日加载失败）', async () => {
    stubBackend({ failOtd: true })
    renderWithProviders(<DiaryEditorPage />, { route: '/diary/editor' })

    await waitFor(() => {
      expect(screen.getByText(/加载失败：往年今日加载失败/)).toBeTruthy()
    })
  })

  it('regenerate-cornie：调用长任务接口并保留本地未保存 userText', async () => {
    const fetchMock = stubBackend()
    renderWithProviders(<DiaryEditorPage />, { route: '/diary/editor' })

    const textarea = await screen.findByPlaceholderText('今天发生了什么？写一点也行。')
    fireEvent.change(textarea, { target: { value: '我还没保存的草稿' } })

    fireEvent.click(await screen.findByRole('button', { name: '让铃湾写一篇' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes('/regenerate-cornie'))
      ).toBe(true)
    })
    // 服务端返回 userText=服务端旧内容，但本地未保存草稿必须保留
    await waitFor(() => {
      expect((screen.getByPlaceholderText('今天发生了什么？写一点也行。') as HTMLTextAreaElement).value).toBe(
        '我还没保存的草稿'
      )
    })
    // cornieText 被替换为新生成内容
    expect(
      (screen.getByPlaceholderText('点击「让铃湾写一篇」生成。') as HTMLTextAreaElement).value
    ).toBe('铃湾新写的一篇')
  })

  it('往年今日列表正常渲染', async () => {
    stubBackend()
    renderWithProviders(<DiaryEditorPage />, { route: '/diary/editor' })

    await waitFor(() => {
      expect(screen.getByText('2025-02-14')).toBeTruthy()
      expect(screen.getByText('去年今天')).toBeTruthy()
    })
    expect(screen.getByText(`往年今日`)).toBeTruthy()
    expect(screen.getByText(todayKey())).toBeTruthy()
  })
})
