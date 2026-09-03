// 竞态守卫（Cornie-021 FE-05；从 Vue 版迁移为 React hook）。
// 场景：快速切换日期/视图时，旧请求的响应可能晚到并覆盖新状态。
// 用法：begin(key) 使同 key 的旧调用失效（Abort 旧请求 + 序号 +1）；
//       请求回调（成功/失败）先 isCurrent(key, token) 再写状态；
//       finally 中 isCurrent 通过才复位 loading 并 end(key, token)。
// 组件卸载时自动 Abort 全部在途请求。

import { useEffect, useRef } from 'react'

export interface RequestGuardBegin {
  token: number
  signal: AbortSignal
}

export interface RequestGuard {
  begin(key: string): RequestGuardBegin
  isCurrent(key: string, token: number): boolean
  end(key: string, token: number): void
}

export function useRequestGuard(): RequestGuard {
  const tokensRef = useRef(new Map<string, number>())
  const controllersRef = useRef(new Map<string, AbortController>())

  useEffect(() => {
    const tokens = tokensRef.current
    const controllers = controllersRef.current
    return () => {
      for (const controller of controllers.values()) controller.abort()
      controllers.clear()
      tokens.clear()
    }
  }, [])

  const begin = (key: string): RequestGuardBegin => {
    const tokens = tokensRef.current
    const controllers = controllersRef.current
    const token = (tokens.get(key) || 0) + 1
    tokens.set(key, token)
    const prev = controllers.get(key)
    if (prev) {
      prev.abort()
      controllers.delete(key)
    }
    const controller = new AbortController()
    controllers.set(key, controller)
    return { token, signal: controller.signal }
  }

  const isCurrent = (key: string, token: number): boolean => tokensRef.current.get(key) === token

  const end = (key: string, token: number): void => {
    if (isCurrent(key, token)) {
      controllersRef.current.delete(key)
    }
  }

  return { begin, isCurrent, end }
}
