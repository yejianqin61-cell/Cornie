import path from 'node:path'

export const MEMORY_WIKI_ROOT_SEGMENTS = ['data', 'memory-wiki']
export const MEMORY_WIKI_PAGES_SEGMENTS = [...MEMORY_WIKI_ROOT_SEGMENTS, 'pages']
export const MEMORY_WIKI_INDEX_SEGMENTS = [...MEMORY_WIKI_ROOT_SEGMENTS, 'index']

export const MEMORY_WIKI_PAGE_TYPE_DIRECTORY = Object.freeze({
  preference: 'preferences',
  dislike: 'preferences',
  need: 'needs',
  goal: 'goals',
  project: 'projects',
  person: 'people',
  topic: 'topics',
  event: 'events',
  routine: 'routines'
})

export const MEMORY_WIKI_PAGE_TYPES = Object.freeze(Object.keys(MEMORY_WIKI_PAGE_TYPE_DIRECTORY))

export function resolveMemoryWikiRoot(baseDir) {
  return path.resolve(baseDir, ...MEMORY_WIKI_ROOT_SEGMENTS)
}

export function resolveMemoryWikiPagesRoot(baseDir) {
  return path.resolve(baseDir, ...MEMORY_WIKI_PAGES_SEGMENTS)
}

export function resolveMemoryWikiIndexRoot(baseDir) {
  return path.resolve(baseDir, ...MEMORY_WIKI_INDEX_SEGMENTS)
}
