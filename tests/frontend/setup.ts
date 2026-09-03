import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// 前端测试环境 shim（等价旧 setup.mjs 的职责，迁移到 TS + RTL）。
// 门禁 verify-task136 要求本文件包含 ResizeObserver shim。

if (!globalThis.fetch) {
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
  })) as unknown as typeof fetch
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// document.fonts：jsdom 缺失，Mantine Textarea Autosize 挂载时会调用其 addEventListener。
if (!document.fonts) {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: {
      addEventListener: () => {},
      removeEventListener: () => {},
      check: () => true,
      ready: Promise.resolve(),
    },
  })
}

// matchMedia：jsdom 自带但调用即抛（Not implemented），必须无条件覆盖为可用的 stub。
Object.defineProperty(globalThis.window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// window.cornieDesktop IPC 桥在 jsdom 中不存在——测试默认提供空实现，
// 需要自定义行为的用例可在测试内覆写 window.cornieDesktop。
if (!('cornieDesktop' in globalThis.window)) {
  Object.defineProperty(globalThis.window, 'cornieDesktop', {
    configurable: true,
    writable: true,
    value: {
      dragStart: () => {},
      dragMove: () => {},
      dragEnd: () => {},
      showMainWindow: () => {},
      getAlwaysOnTop: async () => false,
      setAlwaysOnTop: async (value: boolean) => value,
      broadcastDataChanged: () => {},
      onDataChanged: () => () => {},
    },
  })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
