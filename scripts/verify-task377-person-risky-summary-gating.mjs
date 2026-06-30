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
  assert(!neutralContext.memorySummary.includes('[person] 钟奕菲'), '非极高权重人物无 query 时不应默认进入主链')
  assert(!neutralContext.memorySummary.includes('意义：'), '普通场景下不应默认注入人物意义字段')
  assert(!neutralContext.memorySummary.includes('温柔'), '普通场景下不应默认注入人物性格字段')

  const emotionalContext = await buildWikiContext(harness.store, {
    date: '2026-06-30',
    baseDir: harness.baseDir,
    query: '钟奕菲 对我很重要 很温柔',
    pageLimit: 4,
    topicLimit: 4
  })
  assert(emotionalContext.memorySummary.includes('意义：是我前进的动力'), '情感相关 query 下应按需注入人物意义字段')
  assert(emotionalContext.memorySummary.includes('温柔'), '情感相关 query 下应按需注入人物性格字段')

  await harness.close()
  console.log('verify-task377-person-risky-summary-gating: ok')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
