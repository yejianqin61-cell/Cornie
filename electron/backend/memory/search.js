import { searchMemoryEntries } from '../../db.js'

export function buildMemorySearchSummary(store, { query, tags, kind, limit = 5 } = {}) {
  const matches = searchMemoryEntries(store, { query, tags, kind, limit })
  if (matches.length === 0) return '当前没有相关长期记忆。'

  return matches.map((item) => `- ${item.title}: ${item.content}`).join('\n')
}

export function getMemorySearchHits(store, options) {
  return searchMemoryEntries(store, options)
}
