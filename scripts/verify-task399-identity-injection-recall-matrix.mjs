import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task399-identity-injection-recall-matrix')

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })

    await memoryWiki.create({
      pageType: 'identity_profile',
      title: '叶健钦',
      userName: '叶健钦',
      preferredName: '爸爸',
      cornieRelationship: '用户是 Cornie 的爸爸',
      identitySummary: '当前处于学业、项目、实习与求职压力交织阶段。',
      importance: 'critical',
      ownerConfirmed: true,
      status: 'active'
    })

    await memoryWiki.create({
      pageType: 'identity_person',
      title: '钟奕菲',
      personName: '钟奕菲',
      relationshipToUser: '初恋',
      roleSummary: '对用户有高情感权重的重要人物。',
      importance: 'critical',
      ownerConfirmed: true,
      status: 'active',
      summary: '人物摘要'
    })

    await memoryWiki.create({
      pageType: 'identity_person',
      title: '普通朋友',
      personName: '普通朋友',
      relationshipToUser: '朋友',
      importance: 'high',
      ownerConfirmed: true,
      status: 'active',
      summary: '普通朋友摘要'
    })

    await memoryWiki.create({
      pageType: 'identity_preference',
      title: '甜甜的奶茶',
      preferenceType: '饮食',
      stance: '喜欢',
      triggerKeywords: ['甜甜的奶茶', '奶茶', '饮品', '甜'],
      importance: 'high',
      ownerConfirmed: true,
      status: 'active',
      summary: '喜欢奶茶'
    })

    await memoryWiki.create({
      pageType: 'identity_trait',
      title: '高压下容易疲惫',
      traitType: '压力反应',
      traitSummary: '用户在高压阶段容易感到疲惫，但仍会继续扛着事情往前走。',
      triggerKeywords: ['压力', '好累', '疲惫'],
      importance: 'medium',
      ownerConfirmed: false,
      status: 'review',
      summary: '压力反应 trait'
    })

    const neutralContext = await buildWikiContext(harness.store, {
      date: '2026-06-30',
      baseDir: harness.baseDir,
      query: '',
      pageLimit: 6,
      topicLimit: 4
    })
    assert(neutralContext.memorySummary.includes('[identity] 叶健钦'), '主身份页应默认稳定注入')
    assert(neutralContext.memorySummary.includes('[person] 钟奕菲'), '极高权重已确认人物应允许保留轻量痕迹')
    assert(!neutralContext.memorySummary.includes('普通朋友摘要'), '普通高权重人物无 query 时不应默认注入')
    assert(!neutralContext.memorySummary.includes('[preference/'), '偏好页无 query 时不应默认注入')
    assert(!neutralContext.memorySummary.includes('[trait/'), 'trait 页无 query 时不应默认注入')

    const personContext = await buildWikiContext(harness.store, {
      date: '2026-06-30',
      baseDir: harness.baseDir,
      query: '钟奕菲对我很重要',
      pageLimit: 6,
      topicLimit: 4
    })
    assert(personContext.memorySummary.includes('[person] 钟奕菲'), '命中人物 query 时应召回相关人物页')

    const preferenceContext = await buildWikiContext(harness.store, {
      date: '2026-06-30',
      baseDir: harness.baseDir,
      query: '我今天想喝奶茶，想喝点甜甜的饮品',
      pageLimit: 6,
      topicLimit: 4
    })
    assert(preferenceContext.memorySummary.includes('[preference/饮食/'), '命中偏好 query 时应召回 preference 页')

    const traitContext = await buildWikiContext(harness.store, {
      date: '2026-06-30',
      baseDir: harness.baseDir,
      query: '我最近压力真的很大，好累',
      pageLimit: 6,
      topicLimit: 4
    })
    assert(traitContext.memorySummary.includes('[trait/压力反应/'), '命中情绪压力 query 时应召回 trait 页')

    console.log('verify-task399-identity-injection-recall-matrix: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
