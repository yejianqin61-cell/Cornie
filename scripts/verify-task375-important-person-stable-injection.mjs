import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task375-important-person-stable-injection')
  const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })

  await memoryWiki.create({
    pageType: 'identity_profile',
    title: '叶健钦',
    userName: '叶健钦',
    importance: 'critical',
    ownerConfirmed: true,
    summary: '主身份摘要'
  })

  for (let index = 0; index < 6; index += 1) {
    await memoryWiki.create({
      pageType: 'identity_preference',
      title: `偏好${index}`,
      stance: '喜欢',
      preferenceType: '其他',
      importance: 'high',
      ownerConfirmed: true,
      summary: `偏好摘要${index}`
    })
  }

  await memoryWiki.create({
    pageType: 'identity_person',
    title: '钟奕菲',
    personName: '钟奕菲',
    relationshipToUser: '初恋',
    importance: 'critical',
    ownerConfirmed: true,
    summary: '重要人物摘要'
  })

  const context = await buildWikiContext(harness.store, {
    date: '2026-06-30',
    baseDir: harness.baseDir,
    query: '',
    pageLimit: 4,
    topicLimit: 4
  })

  assert(context.memorySummary.includes('[person] 钟奕菲'), '无 query 时高优先级人物页应稳定进入主链摘要')
  assert(!context.memorySummary.includes('偏好摘要0'), '无 query 时未命中的 preference 页不应抢占主链注入名额')

  await harness.close()
  console.log('verify-task375-important-person-stable-injection: ok')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
