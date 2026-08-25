const CORNIE_DATA_CHANGED_EVENT = 'cornie:data-changed'
let remoteSyncBound = false

export function emitDataChanged(detail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CORNIE_DATA_CHANGED_EVENT, { detail }))
  try {
    window.cornieDesktop?.broadcastDataChanged?.(detail)
  } catch {
    // ignore cross-window sync failure
  }
}

export function listenDataChanged(handler) {
  if (typeof window === 'undefined' || typeof handler !== 'function') {
    return () => {}
  }

  ensureRemoteDataSync()

  const wrapped = (event) => {
    handler(event?.detail || {})
  }

  window.addEventListener(CORNIE_DATA_CHANGED_EVENT, wrapped)
  return () => {
    window.removeEventListener(CORNIE_DATA_CHANGED_EVENT, wrapped)
  }
}

function ensureRemoteDataSync() {
  if (remoteSyncBound || typeof window === 'undefined') return
  const subscribe = window.cornieDesktop?.onDataChanged
  if (typeof subscribe !== 'function') return

  remoteSyncBound = true
  subscribe((detail) => {
    window.dispatchEvent(new CustomEvent(CORNIE_DATA_CHANGED_EVENT, { detail }))
  })
}

export function collectChangedDomains(results = []) {
  const changed = {
    ledger: false,
    todo: false,
    schedule: false,
    observation: false,
    memory: false,
  }

  for (const item of Array.isArray(results) ? results : []) {
    if (item?.ok === false) continue
    const name = String(item?.tool_name || '')

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
