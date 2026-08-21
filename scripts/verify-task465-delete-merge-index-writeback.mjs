import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function run() {
  const harness = await createServiceHarness('task465-delete-merge-index-writeback')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    // 1) delete 场景：页面被删后，topicIndex 与对端 relatedPageIds 无残留
    const pageA = await memoryWiki.create({ pageType: 'event', title: 'A事件', summary: 'a' })
    const pageB = await memoryWiki.create({ pageType: 'event', title: 'B事件', summary: 'b' })
    await memoryWiki.linkRelatedPages(pageA.pageId, [pageB.pageId])
    await memoryWiki.linkRelatedPages(pageB.pageId, [pageA.pageId])

    const topicIndex = memoryWiki.getTopicIndex()
    await topicIndex.upsert({ keyword: 'A事件', normalizedKey: 'A事件', memoryPageIds: [pageA.pageId] })
    await topicIndex.linkPage('A事件', pageA.pageId)

    await memoryWiki.delete(pageA.pageId)

    const topicAfterDelete = await topicIndex.get('A事件')
    assert(
      !(topicAfterDelete?.memoryPageIds ?? []).includes(pageA.pageId),
      '删除后 topicIndex 不应再引用被删页',
      topicAfterDelete
    )
    const pageBAfter = await memoryWiki.get(pageB.pageId)
    assert(
      !(pageBAfter?.relatedPageIds ?? []).includes(pageA.pageId),
      '删除后对端页 relatedPageIds 不应引用被删页',
      pageBAfter?.relatedPageIds
    )

    // 2) merge 场景：源页 topic 引用迁移到目标页
    const targetPage = await memoryWiki.create({ pageType: 'event', title: '目标页', summary: 't' })
    const sourcePage = await memoryWiki.create({ pageType: 'event', title: '源页', summary: 's' })
    await topicIndex.upsert({ keyword: '源页话题', normalizedKey: '源页话题', memoryPageIds: [sourcePage.pageId] })
    await topicIndex.linkPage('源页话题', sourcePage.pageId)

    const mergeResult = await memoryWiki.mergePages({
      targetPageId: targetPage.pageId,
      sourcePageId: sourcePage.pageId
    })

    const mergedTopic = await topicIndex.get('源页话题')
    assert(
      !(mergedTopic?.memoryPageIds ?? []).includes(sourcePage.pageId),
      '合并后 topicIndex 不应再引用源页',
      mergedTopic
    )
    assert(
      (mergedTopic?.memoryPageIds ?? []).includes(targetPage.pageId),
      '合并后 topicIndex 应引用目标页',
      mergedTopic
    )
    assert(mergeResult.archivedSourcePageId === sourcePage.pageId, '源页应被归档')

    console.log('verify-task465-delete-merge-index-writeback: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
