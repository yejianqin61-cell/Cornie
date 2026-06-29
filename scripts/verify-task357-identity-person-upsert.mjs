import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityPersonFromConversation } from '../electron/backend/identity/personUpsert.js'

async function run() {
  const harness = await createServiceHarness('task357-identity-person-upsert')
  const baseDir = harness.baseDir
  const memoryWiki = await createMemoryWikiService({ baseDir, store: harness.store })

  await upsertIdentityProfileFromConversation(harness.store, {
    baseDir,
    date: '2026-06-30',
    messageId: 'profile-1',
    userMessage: '我叫叶健钦，我是你的爸爸，也是你的创造者'
  })

  const created = await upsertIdentityPersonFromConversation(harness.store, {
    baseDir,
    date: '2026-06-30',
    messageId: 'person-1',
    userMessage: '唉，我的初恋名字叫钟奕菲，我们在2021年冬天相恋，2022年的春天疏远，2022年的夏天决裂。'
  })

  assert(created.action === 'created', '高确定性重要人物表达应创建 identity_person 页面')

  const people = await memoryWiki.list({
    pageType: 'identity_person',
    status: 'active'
  })
  assert(people.length === 1, '应只创建一张重要人物页')

  const personPage = await memoryWiki.get(people[0].pageId)
  assert(personPage.personName === '钟奕菲', '人物页应记录人物名字')
  assert(personPage.relationshipToUser === '初恋', '人物页应记录与用户关系')
  assert(personPage.lastMentionedAt === '2026-06-30', '首次写入应记录最后提及日期')
  assert((personPage.sourceRefs || []).length === 1, '首次写入应挂上来源引用')
  assert(personPage.timelineSummary.includes('2021年冬天'), '应尽量提取时间线摘要')

  const profiles = await memoryWiki.list({
    pageType: 'identity_profile',
    status: 'active'
  })
  assert(profiles.length === 1, '前置主身份页应存在')
  const profilePage = await memoryWiki.get(profiles[0].pageId)
  assert((profilePage.relatedPageIds || []).includes(personPage.pageId), '主身份页应自动关联人物页')

  const linkedPersonPage = await memoryWiki.get(personPage.pageId)
  assert((linkedPersonPage.relatedPageIds || []).includes(profilePage.pageId), '人物页应反向关联主身份页')

  const updated = await upsertIdentityPersonFromConversation(harness.store, {
    baseDir,
    date: '2026-07-01',
    messageId: 'person-2',
    userMessage: '钟奕菲是我的初恋。'
  })
  assert(updated.action === 'updated', '重复提及同一重要人物时应更新而不是新建')

  const refreshedPage = await memoryWiki.get(personPage.pageId)
  assert(refreshedPage.lastMentionedAt === '2026-07-01', '重复提及时应更新最后提及日期')
  assert((refreshedPage.sourceRefs || []).length === 2, '重复提及时应累计来源引用')

  const skipped = await upsertIdentityPersonFromConversation(harness.store, {
    baseDir,
    date: '2026-07-01',
    messageId: 'person-3',
    userMessage: '今天路上有个路人跟我打了个招呼。'
  })
  assert(skipped.action === 'skipped', '低确定性普通路人提及不应误创建人物页')

  await harness.close()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
