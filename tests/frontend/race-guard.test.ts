import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRequestGuard } from '../../src/renderer/hooks/useRequestGuard'

// 竞态守卫回归（移植自旧 race-guard.test.mjs）：FE-05 语义 ——
// begin(key) 使同 key 旧调用失效并 Abort 旧请求；isCurrent 校验 token；卸载全 Abort。

describe('useRequestGuard', () => {
  it('begin 使旧 token 失效并 abort 旧 signal', () => {
    const { result } = renderHook(() => useRequestGuard())

    const first = result.current.begin('entry')
    expect(result.current.isCurrent('entry', first.token)).toBe(true)

    const second = result.current.begin('entry')
    expect(first.signal.aborted).toBe(true)
    expect(result.current.isCurrent('entry', first.token)).toBe(false)
    expect(result.current.isCurrent('entry', second.token)).toBe(true)

    act(() => {
      result.current.end('entry', second.token)
    })
  })

  it('不同 key 互不干扰', () => {
    const { result } = renderHook(() => useRequestGuard())
    const a = result.current.begin('entry')
    const b = result.current.begin('otd')
    expect(a.signal.aborted).toBe(false)
    expect(b.signal.aborted).toBe(false)
    expect(result.current.isCurrent('entry', a.token)).toBe(true)
    expect(result.current.isCurrent('otd', b.token)).toBe(true)
  })

  it('end 仅清理当前 token 的控制器', () => {
    const { result } = renderHook(() => useRequestGuard())
    const stale = result.current.begin('messages')
    result.current.begin('messages')
    act(() => {
      result.current.end('messages', stale.token)
    })
    // stale token 已不 current；end 不应误清新请求（isCurrent false 分支）
    expect(result.current.isCurrent('messages', stale.token)).toBe(false)
  })

  it('卸载时 abort 全部在途请求', () => {
    const { result, unmount } = renderHook(() => useRequestGuard())
    const a = result.current.begin('a')
    const b = result.current.begin('b')
    unmount()
    expect(a.signal.aborted).toBe(true)
    expect(b.signal.aborted).toBe(true)
  })
})
