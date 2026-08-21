import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityPreferenceFromConversation } from '../electron/backend/identity/preferenceUpsert.js'
import { upsertIdentityTraitFromConversation } from '../electron/backend/identity/traitUpsert.js'

async function run() {
  const harness = await createServiceHarness('task374-identity-profile-preference-trait-links')
  const baseDir = harness.baseDir
  const store = harness.store
  const memoryWiki = await createMemoryWikiService({ baseDir, store })
  const date = '2026-06-30'

  const profileResult = await upsertIdentityProfileFromConversation(store, {
    baseDir,
    date,
    messageId: 'profile-msg',
    userMessage: '我叫叶健钦，你可以叫我爸爸，我是你的创造者，也是你的爸爸。',
    candidate: {
      userName: '叶健钦',
      preferredName: '爸爸',
      cornieRelationship: '用户是 Cornie 的创造者和爸爸'
    }
  })
  assert(profileResult.pageId, '应先建立主身份页')

  const preferenceResult = await upsertIdentityPreferenceFromConversation(store, {
    baseDir,
    date,
    messageId: 'pref-msg',
    userMessage: '我喜欢奶茶',
    candidate: {
      title: '奶茶',
      stance: '喜欢',
      preferenceType: '饮食',
      triggerKeywords: ['奶茶']
    }
  })
  assert(preferenceResult.pageId, '应成功创建偏好页')

  const traitResult = await upsertIdentityTraitFromConversation(store, {
    baseDir,
    date,
    messageId: 'trait-msg',
    userMessage: '我真的好累，压力好大。',
    candidate: {
      title: '高压下容易疲惫',
      traitType: '压力反应',
      traitSummary: '用户在高压阶段容易感到疲惫，但仍倾向继续扛着事情往前走。',
      triggerKeywords: ['累', '好累', '疲惫', '压力']
    }
  })
  assert(traitResult.pageId, '应成功创建侧写页')

  const profilePage = await memoryWiki.get(profileResult.pageId)
  const preferencePage = await memoryWiki.get(preferenceResult.pageId)
  const traitPage = await memoryWiki.get(traitResult.pageId)

  assert(profilePage.relatedPageIds.includes(preferenceResult.pageId), '主身份页应自动关联偏好页')
  assert(profilePage.relatedPageIds.includes(traitResult.pageId), '主身份页应自动关联侧写页')
  assert(preferencePage.relatedPageIds.includes(profileResult.pageId), '偏好页应反向关联主身份页')
  assert(traitPage.relatedPageIds.includes(profileResult.pageId), '侧写页应反向关联主身份页')

  await harness.close()
  console.log('verify-task374-identity-profile-preference-trait-links: ok')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
