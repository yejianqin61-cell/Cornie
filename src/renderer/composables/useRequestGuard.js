// 竞态守卫（Cornie-021 FE-05）。
// 场景：快速切换日期/视图时，旧请求的响应可能晚到并覆盖新状态。
// 用法：begin(key) 使同 key 的旧调用失效（Abort 旧请求 + 序号 +1）；
//       请求回调（成功/失败）先 isCurrent(key, token) 再写状态；
//       finally 中 isCurrent 通过才复位 loading 并 end(key, token)。
// 组件卸载时自动 Abort 全部在途请求。

import { onBeforeUnmount } from 'vue'

export function useRequestGuard() {
  const tokens = new Map()
  const controllers = new Map()

  function begin(key) {
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

  function isCurrent(key, token) {
    return tokens.get(key) === token
  }

  function end(key, token) {
    if (isCurrent(key, token)) {
      controllers.delete(key)
    }
  }

  onBeforeUnmount(() => {
    for (const controller of controllers.values()) controller.abort()
    controllers.clear()
    tokens.clear()
  })

  return { begin, isCurrent, end }
}
