// 452：记忆页跨轮短 TTL 缓存（进程内）。
// 读侧缓存，写侧必失效（由 memory-wiki 服务在写入路径调用 invalidate）。
export function createPageCache({ ttlMs = 5 * 60 * 1000 } = {}) {
  const store = new Map()

  return {
    get(pageId) {
      if (!pageId) return null
      const entry = store.get(pageId)
      if (!entry) return null
      if (Date.now() - entry.timestamp > ttlMs) {
        store.delete(pageId)
        return null
      }
      return entry.page
    },

    set(pageId, page) {
      if (!pageId || !page) return
      store.set(pageId, { page, timestamp: Date.now() })
    },

    invalidate(pageId) {
      if (!pageId) return
      store.delete(pageId)
    },

    clear() {
      store.clear()
    },

    size() {
      return store.size
    }
  }
}
