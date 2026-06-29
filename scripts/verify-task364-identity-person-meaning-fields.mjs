import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityPersonFromConversation } from '../electron/backend/identity/personUpsert.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task364-identity-person-meaning-fields')
  const baseDir = harness.baseDir
  const memoryWiki = await createMemoryWikiService({ baseDir, store: harness.store })

  try {
    await upsertIdentityProfileFromConversation(harness.store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'profile-1',
      userMessage: '我叫叶健钦，我是你的爸爸，也是你的创造者。'
    })

    const created = await upsertIdentityPersonFromConversation(harness.store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'person-meaning-1',
      userMessage: '我的初恋名字叫钟奕菲，她很温柔，很害羞，很内向。我觉得她对我很重要，是我前进的动力。'
    })

    assert(created.action === 'created', '高确定性重要人物表达应成功创建人物页')

    const people = await memoryWiki.list({
      pageType: 'identity_person',
      status: 'active'
    })
    assert(people.length === 1, '应只创建一张重要人物页')

    const personPage = await memoryWiki.get(people[0].pageId)
    assert(personPage.personalitySummary.length > 0, '人物页应补齐保守的人物性格摘要')
    assert(personPage.meaningToUser.length > 0, '人物页应补齐对用户意义字段')

    const wikiContext = await buildWikiContext(harness.store, {
      date: '2026-06-30',
      baseDir,
      query: '钟奕菲 对我很重要 温柔'
    })
    assert(wikiContext.memorySummary.includes('意义：'), '相关 query 下人物摘要应带出意义字段')

    const governanceRequests = await memoryWiki.listGovernanceRequests({
      requestType: 'identity_person_review',
      queueSection: 'identity_person_reviews'
    })
    assert(governanceRequests.length >= 1, '高风险人物性格/意义归纳应进入治理候选')

    const skipped = await upsertIdentityPersonFromConversation(harness.store, {
      baseDir,
      date: '2026-07-01',
      messageId: 'person-meaning-2',
      userMessage: '今天我想到钟奕菲了。'
    })
    assert(['skipped', 'updated', 'noop', 'conflict'].includes(skipped.action), '模糊提及不应强写新的人物性格字段')

    const refreshed = await memoryWiki.get(personPage.pageId)
    assert(refreshed.personalitySummary === personPage.personalitySummary, '模糊提及不应覆盖已存在的人物性格摘要')

    console.log('verify-task364-identity-person-meaning-fields: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
