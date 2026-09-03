import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MantineProvider } from '@mantine/core'
import App from '../../src/renderer/App'
import { routes } from '../../src/renderer/router'
import { theme as appTheme, cssVariableResolver as appResolver } from '../../src/renderer/theme/theme'

// 应用烟测（移植自旧 app-smoke.test.mjs；门禁 verify-task136）。
// 覆盖：配网引导门禁（未配置 DeepSeek 时遮蔽内容区）、外壳导航、品牌区。

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderApp(initialUrl = '/chat') {
  const router = createMemoryRouter([{ element: <App />, children: routes }], {
    initialEntries: [initialUrl],
  })
  return render(
    <MantineProvider theme={appTheme} cssVariablesResolver={appResolver} forceColorScheme="light">
      <RouterProvider router={router} />
    </MantineProvider>
  )
}

function stubUnconfiguredBackend() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void init
    const url = String(input)
    if (url.includes('/model/status')) return jsonResponse({ ok: false, configured: false, provider: 'deepseek', model: '', reason: '' })
    if (url.includes('/settings/model')) return jsonResponse({ settings: { configured: false, maskedApiKey: '', baseUrl: '', model: '', timeoutMs: null } })
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('应用烟测', () => {
  it('未配置 DeepSeek → 配网引导遮蔽内容区（onboarding gate）', async () => {
    stubUnconfiguredBackend()
    renderApp('/')

    await waitFor(() => {
      expect(screen.getByText('先把 DeepSeek 的钥匙交给铃湾吧')).toBeTruthy()
    })
    expect(screen.getByPlaceholderText('把你的 API Key 放在这里')).toBeTruthy()
    expect(screen.getByRole('button', { name: '保存并检测' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '只检测' })).toBeTruthy()
  })

  it('外壳：8 个导航入口 + 品牌区 + 状态点', async () => {
    stubUnconfiguredBackend()
    renderApp('/')

    for (const label of ['聊天', '日记', '收支', '待办', '日程', '观察日志', '记忆 Wiki', '设置']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    expect(screen.getByText('铃湾')).toBeTruthy()
    expect(screen.getByText('未连接')).toBeTruthy()
  })

  it('引导表单提交 → 保存并检测（PUT /settings/model + 状态刷新）', async () => {
    const fetchMock = stubUnconfiguredBackend()
    renderApp('/')

    await waitFor(() => {
      expect(screen.getByPlaceholderText('把你的 API Key 放在这里')).toBeTruthy()
    })
    fireEvent.change(screen.getByPlaceholderText('把你的 API Key 放在这里'), {
      target: { value: 'sk-test-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存并检测' }))

    await waitFor(() => {
      const put = (fetchMock.mock.calls as Array<[RequestInfo | URL, RequestInit | undefined]>).find(
        ([, init]) => init?.method === 'PUT'
      )
      expect(put).toBeTruthy()
      const body = JSON.parse(String((put![1] as RequestInit).body))
      expect(body.apiKey).toBe('sk-test-123')
    })
  })
})
