import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { describe, expect, it, vi } from 'vitest'
import DeepseekConfigPage from '../../src/renderer/pages/DeepseekConfigPage'
import { theme, cssVariableResolver } from '../../src/renderer/theme/theme'
import type { AppOutletContext } from '../../src/renderer/App'

// 设置流回归（对齐门禁 verify-task138：清空已保存钥匙 + 保存契约）。
// DeepseekConfigPage 依赖外壳 Outlet context（refreshModelState）——测试按 App 真实
// 装配提供 <Outlet context>，同时覆盖该契约本身。

function renderDeepseekConfig() {
  const context: AppOutletContext = {
    modelStatus: { ok: true, configured: true, provider: 'deepseek', model: 'deepseek-chat', reason: '' },
    modelSettings: { configured: true, maskedApiKey: 'sk-***abc', baseUrl: '', model: 'deepseek-chat', timeoutMs: 30000 },
    refreshModelState: async () => {},
  }
  return render(
    <MantineProvider theme={theme} cssVariablesResolver={cssVariableResolver} forceColorScheme="light">
      <DatesProvider settings={{ firstDayOfWeek: 1 }}>
        <MemoryRouter initialEntries={['/settings/deepseek']}>
          <Routes>
            <Route
              path="/settings"
              element={<Outlet context={context} />}
            >
              <Route path="deepseek" element={<DeepseekConfigPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </DatesProvider>
    </MantineProvider>
  )
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function stubBackend(options: { configured?: boolean; failSave?: boolean } = {}) {
  const configured = options.configured ?? true
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init as RequestInit | undefined)?.method
    if (url.includes('/model/status')) {
      return jsonResponse({ ok: configured, configured, provider: 'deepseek', model: 'deepseek-chat' })
    }
    if (url.includes('/settings/model') && method === 'PUT') {
      if (options.failSave) {
        return new Response(JSON.stringify({ error: 'invalid timeout' }), { status: 400 })
      }
      return jsonResponse({ ok: true })
    }
    if (url.includes('/settings/model') && method === 'DELETE') {
      return jsonResponse({ ok: true })
    }
    if (url.includes('/settings/model')) {
      return jsonResponse({
        settings: {
          configured,
          maskedApiKey: configured ? 'sk-***abc' : '',
          baseUrl: 'https://api.deepseek.com',
          model: 'deepseek-chat',
          timeoutMs: 30000,
        },
      })
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('DeepseekConfigPage 设置流', () => {
  it('已配置态：展示 maskedApiKey + 清空钥匙按钮；清空触发 DELETE 并提示收好', async () => {
    const fetchMock = stubBackend({ configured: true })
    renderDeepseekConfig()

    // 加载完成后显示已保存指纹
    await waitFor(() => {
      expect(screen.getByText(/当前已保存：sk-\*\*\*abc/)).toBeTruthy()
    })

    // 清空已保存钥匙
    fireEvent.click(screen.getByRole('button', { name: '清空钥匙' }))
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url, init]) => String(url).includes('/settings/model') && (init as RequestInit)?.method === 'DELETE')
      ).toBe(true)
    })
    await waitFor(() => {
      expect(screen.getByText('已经把本地保存的钥匙收起来啦。')).toBeTruthy()
    })
  })

  it('保存契约：四个字段字符串原样入 PUT payload', async () => {
    const fetchMock = stubBackend({ configured: false })
    renderDeepseekConfig()

    const apiKey = await screen.findByPlaceholderText('把你的钥匙放在这里')
    fireEvent.change(apiKey, { target: { value: 'sk-new-key' } })
    fireEvent.change(screen.getByPlaceholderText('默认地址即可'), {
      target: { value: 'https://api.example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('deepseek-chat'), { target: { value: 'deepseek-reasoner' } })
    fireEvent.change(screen.getByPlaceholderText('30000'), { target: { value: '45000' } })

    fireEvent.click(screen.getByRole('button', { name: '保存并检测' }))
    await waitFor(() => {
      const put = (fetchMock.mock.calls as Array<[RequestInfo | URL, RequestInit | undefined]>).find(
        ([url, init]) => String(url).includes('/settings/model') && init?.method === 'PUT'
      )
      expect(put).toBeTruthy()
      const body = JSON.parse(String(put![1]!.body))
      expect(body).toEqual({
        apiKey: 'sk-new-key',
        baseUrl: 'https://api.example.com',
        model: 'deepseek-reasoner',
        // 契约：timeoutMs 为字符串原样提交
        timeoutMs: '45000',
      })
    })
    await waitFor(() => {
      expect(screen.getByText('铃湾已经把钥匙收好啦，现在去重新确认连接状态。')).toBeTruthy()
    })
  })

  it('保存失败分支：friendly error 呈现（invalid timeout）', async () => {
    stubBackend({ configured: false, failSave: true })
    renderDeepseekConfig()

    const apiKey = await screen.findByPlaceholderText('把你的钥匙放在这里')
    fireEvent.change(apiKey, { target: { value: 'sk-x' } })
    fireEvent.click(screen.getByRole('button', { name: '保存并检测' }))

    await waitFor(() => {
      expect(screen.getByText('超时毫秒要填成正整数呀，比如 30000。')).toBeTruthy()
    })
  })
})
