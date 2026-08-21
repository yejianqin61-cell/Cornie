import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { openDb } from '../electron/db.js'
import { createMemoryWikiService, createMemoryWikiAuditStore } from '../electron/backend/memory-wiki/index.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { runMemoryDistillation } from '../electron/backend/agent/memoryDistillation.js'
import { createRuntimeSqlitePath, cleanupSqliteFile } from './tmp-artifacts.mjs'

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

async function createEnv(caseName) {
  const dbPath = await createRuntimeSqlitePath(`verify90-${caseName}-${randomUUID()}`)
  cleanupSqliteFile(dbPath)
  const store = await openDb(dbPath)
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), `cornie-verify90-${caseName}-`))
  return {
    store,
    baseDir,
    dbPath,
    async close() {
      try {
        store.close()
      } catch {}
      cleanupSqliteFile(dbPath)
      fs.rmSync(baseDir, { recursive: true, force: true })
    }
  }
}

function chatFnWith(contentOrThrow) {
  return async () => {
    if (typeof contentOrThrow === 'function') {
      return contentOrThrow()
    }
    return { content: typeof contentOrThrow === 'string' ? contentOrThrow : JSON.stringify(contentOrThrow) }
  }
}

const DISTILLED_ENVELOPE = {
  observations: [
    {
      action: 'create',
      type: 'event',
      title: '提炼轮次落地',
      content: '主人今天完成了记忆提炼轮次的实现，这是事实提炼而非原话。'
    }
  ],
  identity_updates: [
    { entity: 'profile', action: 'create', fields: { userName: '叶健钦' } }
  ],
  memory_wiki_requests: [],
  reasoning: '冒烟用例'
}

async function listObservations(store, baseDir, date) {
  return createObservationService(store).listByDate(date)
}

async function listProfilePages(baseDir, store) {
  const memoryWiki = await createMemoryWikiService({ baseDir, store })
  return memoryWiki.listSummaries({ pageType: 'identity_profile' })
}

async function listAuditEvents(baseDir) {
  const auditStore = await createMemoryWikiAuditStore(baseDir)
  return auditStore.list({ limit: 100 })
}

async function runCase(name, { envelope, userMessage = '我叫叶健钦，今天完成了提炼轮次。', cornieMessage = '恭喜主人！', chatFn }) {
  const env = await createEnv(name)
  try {
    const result = await runMemoryDistillation({
      store: env.store,
      baseDir: env.baseDir,
      date: '2026-08-21',
      userMessage,
      cornieMessage,
      messageId: `msg-${name}`,
      history: [],
      chatFn
    })
    return { env, result }
  } catch (error) {
    await env.close()
    throw error
  }
}

async function main() {
  // 用例 1：LLM 提炼写入（观察为事实提炼、身份页来自 LLM 字段、审计 source=llm）
  {
    const { env, result } = await runCase('llm-write', { chatFn: chatFnWith(DISTILLED_ENVELOPE) })
    try {
      assert(result.decisionSource === 'llm', 'decisionSource 应为 llm')
      assert(result.results.observations[0].action === 'created', '观察应 created')
      const observations = await listObservations(env.store, env.baseDir, '2026-08-21')
      assert(observations.length === 1, '应恰好一条观察日志')
      const note = observations[0]
      assert(note.content.includes('事实提炼'), '观察内容应为提炼事实')
      assert(!note.content.includes('主人：'), '观察内容不得是原话拼接')

      assert(result.results.identityUpdates[0].action === 'created', '身份页应 created')
      const profiles = await listProfilePages(env.baseDir, env.store)
      assert(profiles.length === 1, '应恰好一个主身份页')
      assert(profiles[0].title === '叶健钦', '主身份页标题应来自 LLM 字段')

      const audit = await listAuditEvents(env.baseDir)
      const distillation = audit.find((item) => item.eventType === 'memory_distillation' && item.details?.source === 'llm')
      assert(Boolean(distillation), '应存在 source=llm 的 memory_distillation 审计')
    } finally {
      await env.close()
    }
    console.log('verify-9.0: 用例1 提炼写入 ok')
  }

  // 用例 2：全 skip → 零写入
  {
    const { env, result } = await runCase('all-skip', {
      chatFn: chatFnWith({ observations: [], identity_updates: [], memory_wiki_requests: [], reasoning: '' })
    })
    try {
      assert(result.decisionSource === 'llm', 'decisionSource 应为 llm')
      assert(result.results.observations.length === 0, '观察提议应为空')
      assert(result.results.identityUpdates.length === 0, '身份提议应为空')
      assert((await listObservations(env.store, env.baseDir, '2026-08-21')).length === 0, '全 skip 零观察写入')
      assert((await listProfilePages(env.baseDir, env.store)).length === 0, '全 skip 零身份页')
    } finally {
      await env.close()
    }
    console.log('verify-9.0: 用例2 全 skip 零写入 ok')
  }

  // 用例 3：非法 JSON → 零写入 + 审计 unavailable
  {
    const { env, result } = await runCase('bad-json', { chatFn: chatFnWith('这不是 JSON') })
    try {
      assert(result.decisionSource === 'unavailable', '非法 JSON 应判不可用')
      assert((await listObservations(env.store, env.baseDir, '2026-08-21')).length === 0, '非法 JSON 零观察写入')
      assert((await listProfilePages(env.baseDir, env.store)).length === 0, '非法 JSON 零身份页')
      const audit = await listAuditEvents(env.baseDir)
      assert(audit.some((item) => item.details?.source === 'unavailable'), '应存在 unavailable 审计')
    } finally {
      await env.close()
    }
    console.log('verify-9.0: 用例3 非法 JSON 零写入 ok')
  }

  // 用例 4：无 Key（模型不可用）→ 零写入 + 审计 unavailable
  {
    const { env, result } = await runCase('no-key', {
      chatFn: chatFnWith(() => {
        const error = new Error('DeepSeek API key is not configured')
        error.code = 'missing_api_key'
        throw error
      })
    })
    try {
      assert(result.decisionSource === 'unavailable', '无 Key 应判不可用')
      assert(result.reason.includes('missing_api_key'), '不可用原因应含 missing_api_key')
      assert((await listObservations(env.store, env.baseDir, '2026-08-21')).length === 0, '无 Key 零观察写入')
      assert((await listProfilePages(env.baseDir, env.store)).length === 0, '无 Key 零身份页')
    } finally {
      await env.close()
    }
    console.log('verify-9.0: 用例4 无 Key 零写入 ok')
  }

  // 用例 5：否定句反例（LLM 决策为空 → 不写压力）
  {
    const { env, result } = await runCase('negation', {
      userMessage: '我不累，最近挺好的，没什么压力。',
      chatFn: chatFnWith({ observations: [], identity_updates: [], memory_wiki_requests: [], reasoning: '无值得沉淀的信息' })
    })
    try {
      assert(result.decisionSource === 'llm', 'decisionSource 应为 llm')
      assert((await listObservations(env.store, env.baseDir, '2026-08-21')).length === 0, '否定句不应产生观察')
      const profiles = await listProfilePages(env.baseDir, env.store)
      assert(profiles.length === 0, '否定句不应产生身份页（无 stressors 写入）')
    } finally {
      await env.close()
    }
    console.log('verify-9.0: 用例5 否定句反例 ok')
  }

  // 用例 6：破坏性 Wiki 请求 → 入治理队列，页面未改
  {
    const { env, result } = await runCase('destructive', {
      chatFn: chatFnWith({
        observations: [],
        identity_updates: [],
        memory_wiki_requests: [{ action: 'merge_pages', title: '合并页面', targetPageId: 't', sourcePageId: 's' }],
        reasoning: '提议合并'
      })
    })
    try {
      assert(result.results.wikiRequests[0].action === 'deferred_to_governance', '破坏性请求应入治理队列')
      const memoryWiki = await createMemoryWikiService({ baseDir: env.baseDir, store: env.store })
      const governance = await memoryWiki.listGovernanceRequests({ queueSection: 'memory_wiki_llm_proposals' })
      assert(governance.some((item) => item.requestType === 'memory_wiki_llm_proposal'), '治理队列应含 llm 提议')
      assert(!(await memoryWiki.get('t').catch(() => null)), '目标页不应被实际创建')
    } finally {
      await env.close()
    }
    console.log('verify-9.0: 用例6 破坏性请求入治理 ok')
  }

  console.log('verify-9.0-memory-distillation: passed 6/6')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
