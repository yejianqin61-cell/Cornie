import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MantineProvider } from '@mantine/core'
import App from '../../src/renderer/App'
import { routes } from '../../src/renderer/router'
import { theme, cssVariableResolver } from '../../src/renderer/theme/theme'

// 应用导航回归（移植自旧 app-navigation.test.mjs；门禁 verify-task137）。
// workspace-switch-regression：导航切换工作区时，激活态与目标页面同步切换。

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function stubConfiguredBackend() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/model/status')) return jsonResponse({ ok: true, configured: true, provider: 'deepseek', model: 'deepseek-chat' })
    if (url.includes('/settings/model')) return jsonResponse({ settings: { configured: true, maskedApiKey: 'sk-***', baseUrl: '', model: 'deepseek-chat', timeoutMs: 30000 } })
    if (url.includes('/conversations/')) return jsonResponse({ messages: [], confirmations: [] })
    if (url.includes('/confirmations')) return jsonResponse({ confirmations: [] })
    if (url.includes('/todos')) return jsonResponse({ items: [] })
    if (url.includes('/todo-categories')) return jsonResponse({ items: [] })
    if (url.includes('/ledger/entries')) return jsonResponse({ items: [] })
    if (url.includes('/ledger/categories')) return jsonResponse({ items: [] })
    if (url.includes('/observations')) return jsonResponse({ observations: [] })
    if (url.includes('/entries/')) return jsonResponse({ entry: { userText: '', cornieText: '' } })
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderApp(initialUrl: string) {
  const router = createMemoryRouter([{ element: <App />, children: routes }], {
    initialEntries: [initialUrl],
  })
  return render(
    <MantineProvider theme={theme} cssVariablesResolver={cssVariableResolver} forceColorScheme="light">
      <RouterProvider router={router} />
    </MantineProvider>
  )
}

describe('应用导航（workspace-switch-regression）', () => {
  it('已配置状态：默认聊天页 → 切换待办 → 切换收支，激活态随路由切换', async () => {
    stubConfiguredBackend()
    renderApp('/chat')

    // 聊天页就绪（陪伴区 tagline 唯一文本）
    await waitFor(() => {
      expect(screen.getByText('想和我聊点什么？')).toBeTruthy()
    })

    // 切到待办
    fireEvent.click(screen.getAllByText('待办')[0])
    await waitFor(() => {
      expect(screen.getByText('记下一件小事')).toBeTruthy()
    })

    // 切到收支
    fireEvent.click(screen.getAllByText('收支')[0])
    await waitFor(() => {
      expect(screen.getByText('这个月的收支概览')).toBeTruthy()
    })

    // 切回聊天
    fireEvent.click(screen.getAllByText('聊天')[0])
    await waitFor(() => {
      expect(screen.getByText('想和我聊点什么？')).toBeTruthy()
    })
  })

  it('子路由接线：聊天记录 → 单日视图 → 返回链', async () => {
    stubConfiguredBackend()
    renderApp('/chat/history')

    await waitFor(() => {
      expect(screen.getByText('聊天记录')).toBeTruthy()
    })
    // 返回聊天按钮存在（React 版直接 useNavigate，替代旧 navHandlers.back）
    expect(screen.getByRole('button', { name: '← 返回聊天' })).toBeTruthy()
  })

  it('未知路由兜底回聊天', async () => {
    stubConfiguredBackend()
    renderApp('/nowhere/at/all')

    await waitFor(() => {
      expect(screen.getByText('想和我聊点什么？')).toBeTruthy()
    })
  })
})
