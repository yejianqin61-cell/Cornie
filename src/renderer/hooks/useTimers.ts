// 定时器工具（Cornie-021 FE-04；从 Vue 版迁移为 React hooks）。
// 统一管理 setInterval / setTimeout：组件卸载自动清理，业务组件不再手写裸定时器。

import { useEffect, useRef } from 'react'

/**
 * 周期执行：挂载后按 ms 触发；组件卸载自动 clearInterval。
 * fn/ms 变化时自动重启；返回 stop 可手动停止（停止后不会随重渲染自动恢复）。
 */
export function useInterval(
  fn: () => void,
  ms: number,
  { immediate = false }: { immediate?: boolean } = {}
): {
  start: () => void
  stop: () => void
} {
  const fnRef = useRef(fn)
  fnRef.current = fn
  const stoppedRef = useRef(false)

  useEffect(() => {
    stoppedRef.current = false
    if (immediate) fnRef.current()
    if (!(Number(ms) > 0)) return undefined
    const timer = setInterval(() => fnRef.current(), Number(ms))
    return () => {
      clearInterval(timer)
      stoppedRef.current = true
    }
  }, [ms, immediate])

  return {
    start: () => {
      stoppedRef.current = false
      if (Number(ms) > 0) fnRef.current()
    },
    stop: () => {
      stoppedRef.current = true
    },
  }
}

/**
 * 防抖：value 变化后延迟 ms 触发 onChange(value)；期间再次变化重置计时。
 * 组件卸载时清除未触发的回调（不再触发请求）。
 */
export function useDebouncedValue<T>(value: T, ms: number, onChange: (value: T) => void): void {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const firstRenderRef = useRef(true)

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return undefined
    }
    const timer = setTimeout(() => onChangeRef.current(value), Number(ms) > 0 ? Number(ms) : 0)
    return () => {
      clearTimeout(timer)
    }
  }, [value, ms])
}
