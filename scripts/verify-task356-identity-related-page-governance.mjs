import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function run() {
  const harness = await createServiceHarness('task356-identity-related-page-governance')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  const profile = await memoryWiki.create({
    pageType: 'identity_profile',
    title: '叶健钦',
    userName: '叶健钦',
    preferredName: '健钦',
    cornieRelationship: 'Cornie 的创造者'
  })

  const person = await memoryWiki.create({
    pageType: 'identity_person',
    title: '钟奕菲',
    personName: '钟奕菲',
    relationshipToUser: '初恋'
  })

  let missingError = ''
  try {
    await memoryWiki.linkRelatedPages(profile.pageId, ['missing-page-id'])
  } catch (error) {
    missingError = error?.message || String(error)
  }
  assert(missingError.includes('memory wiki related pages not found'), '关联不存在页面时应直接报错')

  await memoryWiki.linkRelatedPages(profile.pageId, [person.pageId])
  const oneWayTrace = await memoryWiki.getPageSourceTrace(profile.pageId)
  assert(Array.isArray(oneWayTrace.relatedIssues), '来源追溯应返回 relatedIssues')
  assert(
    oneWayTrace.relatedIssues.some((item) => item.issueType === 'one_way_relation' && item.relatedPageId === person.pageId),
    '单向关联时应给出 one_way_relation 提示'
  )

  await memoryWiki.linkRelatedPages(person.pageId, [profile.pageId])
  const twoWayTrace = await memoryWiki.getPageSourceTrace(profile.pageId)
  assert(
    !twoWayTrace.relatedIssues.some((item) => item.issueType === 'one_way_relation' && item.relatedPageId === person.pageId),
    '补齐双向关联后，不应继续报 one_way_relation'
  )

  await harness.close()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
