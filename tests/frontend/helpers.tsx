import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import type { ReactElement, ReactNode } from 'react'

import { theme, cssVariableResolver } from '../../src/renderer/theme/theme'

// 测试渲染助手：MantineProvider + DatesProvider + MemoryRouter 包装（与 main.tsx 应用装配一致）。
// 需要路由参数的页面用 renderWithProviders(ui, { route, path })。

function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariableResolver} forceColorScheme="light">
      <DatesProvider settings={{ firstDayOfWeek: 1 }}>
        <Notifications position="top-right" />
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="*" element={children as ReactElement} />
          </Routes>
        </MemoryRouter>
      </DatesProvider>
    </MantineProvider>
  )
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path = '*' }: { route?: string; path?: string } = {}
) {
  const result = render(
    <MantineProvider theme={theme} cssVariablesResolver={cssVariableResolver} forceColorScheme="light">
      <DatesProvider settings={{ firstDayOfWeek: 1 }}>
        <Notifications position="top-right" />
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </DatesProvider>
    </MantineProvider>
  )
  // rerender 保持同样的 Provider 包裹（否则 Mantine hooks 找不到 context）
  return {
    ...result,
    rerender: (next: ReactElement) => result.rerender(<Providers>{next}</Providers>),
  }
}

/** 默认 fetch mock：可按 URL 前缀分发响应。 */
export interface FetchRoute {
  match: (url: string, init?: RequestInit) => boolean
  response: (url: string, init?: RequestInit) =>
    | { ok?: boolean; status?: number; body?: unknown; text?: string }
    | Promise<{ ok?: boolean; status?: number; body?: unknown; text?: string }>
}

export function installFetchMock(routes: FetchRoute[]) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    for (const route of routes) {
      if (route.match(url, init)) {
        const result = await route.response(url, init)
        const status = result.status ?? 200
        return new Response(JSON.stringify(result.body ?? {}), {
          status,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    return new Response(JSON.stringify({ error: `unmatched url ${url}` }), { status: 404 })
  }) as unknown as typeof fetch
  vi.stubGlobal('fetch', fetchMock)
  return calls
}
