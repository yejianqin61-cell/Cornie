// 452/464：记忆页跨轮短 TTL 缓存（进程内、按命名空间共享）。
// 多个 memory-wiki service 实例（路由/身份 upsert/提炼轮各自创建）共享同一底层存储，
// 因此写侧失效（invalidate）能跨实例生效，避免"另一实例读到过期页"。
// 命名空间用 baseDir + kind，避免不同记忆根目录或页面/追溯两类缓存互相串扰。
const SHARED_CACHE = new Map()

function buildKey(namespace, id) {
  return `${namespace}::${id}`
}

export function createPageCache({ ttlMs = 5 * 60 * 1000, namespace = 'default' } = {}) {
  return {
    get(id) {
      if (!id) return null
      const key = buildKey(namespace, id)
      const entry = SHARED_CACHE.get(key)
      if (!entry) return null
      if (Date.now() - entry.timestamp > ttlMs) {
        SHARED_CACHE.delete(key)
        return null
      }
      return entry.value
    },

    set(id, value) {
      if (!id || !value) return
      SHARED_CACHE.set(buildKey(namespace, id), { value, timestamp: Date.now() })
    },

    invalidate(id) {
      if (!id) return
      SHARED_CACHE.delete(buildKey(namespace, id))
    },

    clear() {
      for (const key of [...SHARED_CACHE.keys()]) {
        if (key.startsWith(`${namespace}::`)) {
          SHARED_CACHE.delete(key)
        }
      }
    },

    size() {
      let count = 0
      for (const key of SHARED_CACHE.keys()) {
        if (key.startsWith(`${namespace}::`)) count += 1
      }
      return count
    }
  }
}
