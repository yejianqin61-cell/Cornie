import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task377-person-risky-summary-gating')
  const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })

  await memoryWiki.create({
    pageType: 'identity_profile',
    title: '叶健钦',
    userName: '叶健钦',
    importance: 'critical',
    ownerConfirmed: true,
    summary: '主身份摘要'
  })

  await memoryWiki.create({
    pageType: 'identity_person',
    title: '钟奕菲',
    personName: '钟奕菲',
    relationshipToUser: '初恋',
    roleSummary: '在人生叙事中具有高情感权重的重要人物。',
    personalitySummary: '温柔；害羞；内向',
    meaningToUser: '是我前进的动力',
    sharedExperienceSummary: '2021年冬天相恋，2022年夏天决裂。',
    timelineSummary: '2021年冬天相恋；2022年夏天决裂',
    firstKnownPeriod: '2021年冬天',
    importance: 'high',
    ownerConfirmed: false
  })

  const neutralContext = await buildWikiContext(harness.store, {
    date: '2026-06-30',
    baseDir: harness.baseDir,
    query: '',
    pageLimit: 4,
    topicLimit: 4
  })
  // 451：人物页以紧凑目录条目出现（`[type/importance] title：summary · date`）；
  // summary 由服务自动拼写，可能含性格/意义内容，但不再由词表门控决定是否展示。
  assert(neutralContext.memorySummary.includes('[identity_person/high] 钟奕菲：'), '人物页以目录条目格式出现')
  assert(!neutralContext.memorySummary.includes('[person] '), '不再使用旧 per-type 注入格式')

  const emotionalContext = await buildWikiContext(harness.store, {
    date: '2026-06-30',
    baseDir: harness.baseDir,
    query: '钟奕菲 对我很重要 很温柔',
    pageLimit: 4,
    topicLimit: 4
  })
  assert(emotionalContext.memorySummary.includes('[identity_person/high] 钟奕菲：'), 'query 下人物仍以目录条目出现（query 只影响排序）')
  assert(!emotionalContext.memorySummary.includes('[person] '), '情绪 query 不恢复旧 per-type 注入格式')

  await harness.close()
  console.log('verify-task377-person-risky-summary-gating: ok')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
