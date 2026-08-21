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
      userMessage: '我叫叶健钦，我是你的爸爸，也是你的创造者。',
      candidate: {
        userName: '叶健钦',
        cornieRelationship: '用户是 Cornie 的爸爸和创造者'
      }
    })

    const created = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'person-timeline-1',
      userMessage: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋，2022年春天疏远，2022年夏天决裂。她对我很重要，是我前进的动力。',
      candidate: {
        personName: '钟奕菲',
        relationshipToUser: '初恋',
        firstKnownPeriod: '2021年冬天',
        timelineSummary: '2021年冬天相恋；2022年春天疏远；2022年夏天决裂',
        meaningToUser: '她对我很重要，是我前进的动力',
        emotionalWeight: 'high'
      }
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

    // 451：人物页以目录条目出现（紧凑三信号：摘要+重要性+最近提及），
    // 时间脉络/意义等字段级信息改由钻取读取，不再拼入注入摘要。
    const wikiContext = await buildWikiContext(store, {
      date: '2026-06-30',
      baseDir,
      query: '钟奕菲 2021 冬天 2022 夏天'
    })

    assert(wikiContext.memorySummary.includes('[identity_person/high] 钟奕菲：'), '人物页应以目录条目格式出现')
    assert(wikiContext.memorySummary.includes('钟奕菲'), '人物目录条目应含标题')
    assert(!wikiContext.memorySummary.includes('首次已知：'), '不再使用旧 per-type 注入格式（字段改由钻取读取）')

    console.log('verify-task372-person-timeline-summary-injection: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
