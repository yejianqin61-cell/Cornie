import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityTraitFromConversation } from '../electron/backend/identity/traitUpsert.js'
import { upsertIdentityPersonFromConversation } from '../electron/backend/identity/personUpsert.js'

async function run() {
  const harness = await createServiceHarness('task383-person-trait-weak-linking')

  try {
    const baseDir = harness.baseDir
    const store = harness.store
    const memoryWiki = await createMemoryWikiService({ baseDir, store })

    const trait = await upsertIdentityTraitFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'trait-1',
      userMessage: '我最近真的好累，压力很大，但还是会继续把项目往前推。',
      candidate: {
        title: '高压下容易疲惫',
        traitType: '压力反应',
        traitSummary: '用户在高压阶段容易感到疲惫，但仍倾向继续扛着事情往前走。',
        triggerKeywords: ['累', '好累', '疲惫', '压力']
      }
    })
    assert(trait.pageId, '应先创建可关联的 trait 页')

    const person = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'person-1',
      userMessage: '钟奕菲是我的初恋，她很温柔。我最近真的好累，压力很大，但还是会继续把项目往前推。',
      candidate: {
        personName: '钟奕菲',
        relationshipToUser: '初恋',
        personalitySummary: '温柔',
        sharedExperienceSummary: '两人一起经历高压力、疲惫但仍坚持推进项目的时期'
      }
    })
    assert(person.pageId, '应创建重要人物页')

    const personPage = await memoryWiki.get(person.pageId)
    const traitPage = await memoryWiki.get(trait.pageId)

    assert(personPage.relatedPageIds.includes(trait.pageId), '重要人物页应弱关联到匹配的 trait 页')
    assert(traitPage.relatedPageIds.includes(person.pageId), 'trait 页应反向关联回重要人物页')

    const repeated = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'person-1',
      userMessage: '钟奕菲是我的初恋，她很温柔。我最近真的好累，压力很大，但还是会继续把项目往前推。',
      candidate: {
        personName: '钟奕菲',
        relationshipToUser: '初恋',
        personalitySummary: '温柔',
        sharedExperienceSummary: '两人一起经历高压力、疲惫但仍坚持推进项目的时期'
      }
    })
    assert(['noop', 'updated'].includes(repeated.action), '重复写入应保持幂等')

    const repeatedPersonPage = await memoryWiki.get(person.pageId)
    const repeatedTraitPage = await memoryWiki.get(trait.pageId)

    assert(repeatedPersonPage.relatedPageIds.filter((item) => item === trait.pageId).length === 1, '重复执行不应重复写入人物页关联')
    assert(repeatedTraitPage.relatedPageIds.filter((item) => item === person.pageId).length === 1, '重复执行不应重复写入 trait 页关联')

    console.log('verify-task383-person-trait-weak-linking: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
