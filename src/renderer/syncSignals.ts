// 跨窗口同步信号（从 Vue 版 syncSignals.js 原样迁移，行为契约不变）。
// - emitDataChanged(detail)：本窗口广播 + 经 IPC 广播到另一窗口；
// - listenDataChanged(handler)：订阅合并后的信号（本窗口 emit + 远端 IPC 转发）；
// - collectChangedDomains(results)：从工具调用结果列表聚合受影响的数据域。

const CORNIE_DATA_CHANGED_EVENT = 'cornie:data-changed'
let remoteSyncBound = false

interface CornieDesktopBridge {
  broadcastDataChanged?: (detail: unknown) => void
  onDataChanged?: (handler: (detail: unknown) => void) => () => void
  dragStart?: (payload: { screenX: number; screenY: number }) => void
  dragMove?: (payload: { screenX: number; screenY: number }) => void
  dragEnd?: () => void
  showMainWindow?: () => void
  getAlwaysOnTop?: () => Promise<boolean>
  setAlwaysOnTop?: (value: boolean) => Promise<boolean>
}

declare global {
  interface Window {
    cornieDesktop?: CornieDesktopBridge
  }
}

export function emitDataChanged(detail: unknown): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CORNIE_DATA_CHANGED_EVENT, { detail }))
  try {
    window.cornieDesktop?.broadcastDataChanged?.(detail)
  } catch {
    // ignore cross-window sync failure
  }
}

export function listenDataChanged(handler: (detail: unknown) => void): () => void {
  if (typeof window === 'undefined' || typeof handler !== 'function') {
    return () => {}
  }

  ensureRemoteDataSync()

  const wrapped = (event: Event): void => {
    handler((event as CustomEvent).detail || {})
  }

  window.addEventListener(CORNIE_DATA_CHANGED_EVENT, wrapped)
  return () => {
    window.removeEventListener(CORNIE_DATA_CHANGED_EVENT, wrapped)
  }
}

function ensureRemoteDataSync(): void {
  if (remoteSyncBound || typeof window === 'undefined') return
  const subscribe = window.cornieDesktop?.onDataChanged
  if (typeof subscribe !== 'function') return

  remoteSyncBound = true
  subscribe((detail) => {
    window.dispatchEvent(new CustomEvent(CORNIE_DATA_CHANGED_EVENT, { detail }))
  })
}

export interface DataChangedDetail {
  ok?: boolean
  tool_name?: string
  results?: Array<{ ok?: boolean; tool_name?: string } | unknown>
  [key: string]: unknown
}

export interface ChangedDomains {
  ledger: boolean
  todo: boolean
  schedule: boolean
  observation: boolean
  memory: boolean
}

export function collectChangedDomains(results: Array<unknown> = []): ChangedDomains {
  const changed: ChangedDomains = {
    ledger: false,
    todo: false,
    schedule: false,
    observation: false,
    memory: false,
  }

  for (const item of Array.isArray(results) ? results : []) {
    const record = item as { ok?: boolean; tool_name?: string } | null
    if (record?.ok === false) continue
    const name = String(record?.tool_name || '')

    if (name.startsWith('ledger.') || name.startsWith('ledger_category.')) changed.ledger = true
    if (name.startsWith('todo.') || name.startsWith('todo_category.')) changed.todo = true
    if (name.startsWith('schedule.') || name.startsWith('schedule_category.')) changed.schedule = true
    if (name.startsWith('observation.')) changed.observation = true
    if (name.startsWith('memory_wiki.') || name.startsWith('memory_index.') || name.startsWith('memory_governance.')) {
      changed.memory = true
    }
  }

  return changed
}
