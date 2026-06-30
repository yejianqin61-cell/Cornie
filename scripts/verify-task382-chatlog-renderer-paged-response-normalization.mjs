import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { assert } from '../tests/shared/service-harness.mjs'

function stripImports(source) {
  return source.replace(/^import\s.+?$/gm, '')
}

function transformExports(source) {
  return source.replace(/export\s+async\s+function\s+([a-zA-Z0-9_]+)/g, 'async function $1')
}

async function loadRendererApi(fetchImpl) {
  const filePath = path.resolve('src/renderer/api.js')
  let source = await fs.readFile(filePath, 'utf8')
  source = stripImports(source)
  source = transformExports(source)
  source += '\nmodule.exports = { getChatlog };'

  const context = {
    fetch: fetchImpl,
    URLSearchParams,
    module: { exports: {} },
    exports: {},
    console
  }
  vm.createContext(context)
  new vm.Script(source, { filename: filePath }).runInContext(context)
  return context.module.exports
}

async function run() {
  const pageResponse = {
    date: '2026-06-30',
    items: [
      { id: 'm-2', role: 'user', content: '第二条' },
      { id: 'm-3', role: 'cornie', content: '第三条' }
    ],
    nextCursor: '2',
    hasMore: true,
    context: {
      date: '2026-06-30',
      total: 5,
      pageSize: 2,
      currentCursor: '0',
      firstItemId: 'm-2',
      lastItemId: 'm-3'
    },
    meta: {
      responseType: 'chatlog_day_page',
      storage: { driver: 'sql.js', queryContractVersion: 2 }
    }
  }

  const legacyResponse = {
    date: '2026-06-30',
    messages: [{ id: 'm-1', role: 'user', content: '第一条' }],
    pagination: {
      cursor: '0',
      nextCursor: null,
      hasMore: false,
      pageSize: 100,
      total: 1
    },
    meta: {
      responseType: 'chatlog_day_record',
      storage: { driver: 'sql.js', queryContractVersion: 2 }
    }
  }

  let callCount = 0
  const { getChatlog } = await loadRendererApi(async () => {
    callCount += 1
    const payload = callCount === 1 ? pageResponse : legacyResponse
    return {
      ok: true,
      status: 200,
      json: async () => payload
    }
  })

  const paged = await getChatlog('2026-06-30', { mode: 'page', limit: 2, cursor: 0 })
  assert(Array.isArray(paged.items) && paged.items.length === 2, 'page 模式下应保留 items')
  assert(Array.isArray(paged.messages) && paged.messages.length === 2, 'page 模式下 messages 应回退到 items')
  assert(paged.pagination.nextCursor === '2', 'page 模式下应标准化 nextCursor')
  assert(paged.pagination.hasMore === true, 'page 模式下应标准化 hasMore')
  assert(paged.context?.firstItemId === 'm-2', 'page 模式下应保留 context')
  assert(paged.meta?.responseType === 'chatlog_day_page', 'page 模式下应保留 responseType')

  const legacy = await getChatlog('2026-06-30')
  assert(Array.isArray(legacy.messages) && legacy.messages.length === 1, 'legacy 模式下 messages 契约不应回归')
  assert(Array.isArray(legacy.items) && legacy.items.length === 0, 'legacy 模式下 items 应为空数组')
  assert(legacy.meta?.responseType === 'chatlog_day_record', 'legacy 模式下应保留 responseType')

  console.log('verify-task382-chatlog-renderer-paged-response-normalization: ok')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
