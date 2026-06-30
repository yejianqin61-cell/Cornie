import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task379-profile-extended-detail-chinese-query')
  const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })

  await memoryWiki.create({
    pageType: 'identity_profile',
    title: '叶健钦',
    userName: '叶健钦',
    cornieRelationship: '用户是 Cornie 的爸爸',
    identitySummary: '当前处于学业、项目、实习与求职压力交织阶段。',
    currentFocus: '项目推进、考试与实习求职',
    stressors: '项目推进压力、考试与学业压力、实习与求职压力',
    communicationPreference: '偏好温柔、克制、能记住上下文的陪伴式交流',
    importance: 'critical',
    ownerConfirmed: true,
    summary: '主身份摘要'
  })

  const neutralContext = await buildWikiContext(harness.store, {
    date: '2026-06-30',
    baseDir: harness.baseDir,
    query: '',
    pageLimit: 4,
    topicLimit: 4
  })
  assert(!neutralContext.memorySummary.includes('压力：'), '空 query 下不应默认注入主身份扩展压力字段')
  assert(!neutralContext.memorySummary.includes('沟通偏好：'), '空 query 下不应默认注入主身份沟通偏好字段')

  const stressContext = await buildWikiContext(harness.store, {
    date: '2026-06-30',
    baseDir: harness.baseDir,
    query: '我最近压力真的很大',
    pageLimit: 4,
    topicLimit: 4
  })
  assert(stressContext.memorySummary.includes('压力：项目推进压力、考试与学业压力、实习与求职压力'), '中文压力 query 下应按需注入 stressors')

  const communicationContext = await buildWikiContext(harness.store, {
    date: '2026-06-30',
    baseDir: harness.baseDir,
    query: '你温柔一点和我说话，记住我的上下文',
    pageLimit: 4,
    topicLimit: 4
  })
  assert(communicationContext.memorySummary.includes('沟通偏好：偏好温柔、克制、能记住上下文的陪伴式交流'), '中文沟通 query 下应按需注入 communicationPreference')

  await harness.close()
  console.log('verify-task379-profile-extended-detail-chinese-query: ok')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
