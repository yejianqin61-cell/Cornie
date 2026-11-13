const PATH_DOMAINS = [
  ['/todos', 'todo'],
  ['/todo-categories', 'todo'],
  ['/schedules', 'schedule'],
  ['/schedule-categories', 'schedule'],
  ['/ledger', 'ledger'],
  ['/observations', 'observation'],
  ['/entries', 'diary'],
  ['/memory-wiki', 'memory'],
  ['/confirmations', '*'],
]

const TOOL_DOMAINS = [
  ['ledger', 'ledger'],
  ['todo', 'todo'],
  ['schedule', 'schedule'],
  ['observation', 'observation'],
  ['memory_wiki', 'memory'],
  ['memory_index', 'memory'],
  ['memory_governance', 'memory'],
]

export function domainOfPath(path) {
  const clean = String(path || '').split('?')[0]
  for (const [fragment, domain] of PATH_DOMAINS) {
    if (clean.includes(fragment)) return domain
  }
  return ''
}

export function domainOfTool(toolName) {
  const name = String(toolName || '')
  for (const [prefix, domain] of TOOL_DOMAINS) {
    if (name.startsWith(prefix)) return domain
  }
  return '*'
}

export function notifyDataChanged({ domain } = {}) {
  if (!domain) return
  try {
    window.cornieDesktop?.broadcastDataChanged?.({ domain })
  } catch {}
}

export function onDataChanged(domains, handler) {
  const bridge = typeof window === 'undefined' ? null : window.cornieDesktop
  if (!bridge?.onDataChanged || typeof handler !== 'function') return () => {}
  const wanted = new Set(domains || [])
  return bridge.onDataChanged((detail) => {
    const domain = detail?.domain
    if (domain === '*' || wanted.has(domain) || wanted.has('*')) handler(detail)
  })
}
