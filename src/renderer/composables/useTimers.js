// 定时器组合式工具（Cornie-021 FE-04）。
// 统一管理 setInterval / setTimeout：组件卸载自动清理，业务组件不再手写裸定时器。

import { onBeforeUnmount, watch } from 'vue'

/**
 * 周期执行：挂载后按 ms 触发；组件卸载自动 clearInterval。
 * 返回 { start, stop }，可手动重启/停止（stop 后不会随组件重新开始）。
 * 注意：业务轮询如需动态 start/stop 且受控启动，请直接使用本工具的 start()，
 * 或用 useChat 内置的 startConversationSync（其内部含防重入与可见性处理）。
 */
export function useInterval(fn, ms, { immediate = false } = {}) {
  let timer = null

  const start = () => {
    stop()
    if (typeof fn === 'function' && Number(ms) > 0) {
      timer = setInterval(fn, Number(ms))
    }
  }

  const stop = () => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  if (immediate && typeof fn === 'function') fn()
  start()

  onBeforeUnmount(stop)

  return { start, stop }
}

/**
 * 防抖：valueRef 变化后延迟 ms 触发 callback(value)；期间再次变化重置计时。
 * 组件卸载时清除未触发的回调（不再触发请求）。
 */
export function useDebouncedValue(valueRef, ms, callback) {
  let timer = null

  watch(valueRef, () => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (typeof callback === 'function') callback(valueRef.value)
    }, Number(ms) > 0 ? Number(ms) : 0)
  })

  onBeforeUnmount(() => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  })
}
