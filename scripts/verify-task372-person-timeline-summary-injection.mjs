import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityPersonFromConversation } from '../electron/backend/identity/personUpsert.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task372-person-timeline-summary-injection')
  const baseDir = harness.baseDir
  const store = harness.store
  const memoryWiki = await createMemoryWikiService({ baseDir, store })

  try {
    await upsertIdentityProfileFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'profile-1',
      userMessage: '我叫叶健钦，我是你的爸爸，也是你的创造者。'
    })

    const created = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'person-timeline-1',
      userMessage: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋，2022年春天疏远，2022年夏天决裂。她对我很重要，是我前进的动力。'
    })

    assert(created.action === 'created', '应成功创建带时间脉络的人物页')

    const people = await memoryWiki.list({
      pageType: 'identity_person',
      status: 'active'
    })
    assert(people.length === 1, '应只存在一张人物页')

    const page = await memoryWiki.get(people[0].pageId)
    assert(page.firstKnownPeriod.length > 0, '人物页应存在 firstKnownPeriod')
    assert(page.timelineSummary.length > 0, '人物页应存在 timelineSummary')

    const wikiContext = await buildWikiContext(store, {
      date: '2026-06-30',
      baseDir,
      query: '钟奕菲 2021 冬天 2022 夏天'
    })

    assert(wikiContext.memorySummary.includes('首次已知：'), 'memory summary 应暴露人物首次已知阶段')
    assert(wikiContext.memorySummary.includes('时间线：'), 'memory summary 应暴露人物时间线字段')
    assert(wikiContext.memorySummary.includes('意义：'), 'memory summary 不应破坏既有人物意义字段表达')

    console.log('verify-task372-person-timeline-summary-injection: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
