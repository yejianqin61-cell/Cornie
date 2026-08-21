import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task451-directory-and-profile-card')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    // 1) 主身份页（ownerConfirmed false，含压力字段）
    const profile = await upsertIdentityProfileFromConversation(harness.store, {
      baseDir: harness.baseDir,
      date: '2026-08-21',
      messageId: 'm-profile',
      userMessage: '我叫叶健钦',
      candidate: {
        userName: '叶健钦',
        currentFocus: '项目推进',
        stressors: '项目推进压力'
      }
    })
    assert(profile.action === 'created', '主身份页应创建')

    // 2) 事件页若干
    for (let i = 0; i < 3; i += 1) {
      await memoryWiki.create({ pageType: 'event', title: `事件${i}`, summary: `摘要${i}` })
    }

    // 3) 已确认重要人物页（ownerConfirmed true）
    const person = await memoryWiki.create({
      pageType: 'identity_person',
      title: '钟奕菲',
      personName: '钟奕菲',
      relationshipToUser: '初恋',
      importance: 'critical',
      ownerConfirmed: true,
      summary: '重要的人'
    })

    const ctx = await buildWikiContext(harness.store, {
      date: '2026-08-21',
      baseDir: harness.baseDir,
      query: ''
    })

    // 4) L0 画像卡：含名字，且 ownerConfirmed=false 时不展开压力字段
    assert(ctx.memorySummary.includes('名字：叶健钦'), '画像卡应含名字', ctx.memorySummary)
    assert(!ctx.memorySummary.includes('压力：项目推进压力'), '未确认画像卡不应展开压力字段', ctx.memorySummary)

    // 5) L0 已确认人物在目录（三信号行）
    assert(ctx.memorySummary.includes('[identity_person/critical] 钟奕菲'), '已确认人物应出现在目录', ctx.memorySummary)

    // 6) L1 目录条目带三信号（摘要 + 重要性 + 时间）
    assert(ctx.memorySummary.includes('[event/medium] 事件0：摘要0'), 'L1 目录应含事件条目', ctx.memorySummary)

    // 7) 确认画像卡后，压力字段展开（ownerConfirmed 可信度门控）
    await memoryWiki.setOwnerConfirmed(profile.pageId, true)
    const ctxConfirmed = await buildWikiContext(harness.store, {
      date: '2026-08-21',
      baseDir: harness.baseDir,
      query: ''
    })
    assert(ctxConfirmed.memorySummary.includes('压力：项目推进压力'), '确认后画像卡应展开压力字段', ctxConfirmed.memorySummary)

    console.log('verify-task451-directory-and-profile-card: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
