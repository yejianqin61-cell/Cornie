import { createMemoryWikiService } from '../../electron/backend/memory-wiki/service.js'
import { createTopicIndexStore } from '../../electron/backend/memory-wiki/topicIndex.js'
import { createServiceHarness, assert } from '../shared/service-harness.mjs'

async function testMemoryWikiLifecycle() {
  const harness = await createServiceHarness('memory-wiki-service')
  try {
    const service = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })

    const created = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '长期主题',
      body: '# 龙虾\n\n很重要'
    })
    assert(created.pageId, 'expected memory wiki page id', created)

    const updated = await service.update({
      pageId: created.pageId,
      summary: '跨日期反复提起的长期主题'
    })
    assert(updated.summary === '跨日期反复提起的长期主题', 'expected summary updated', updated)

    const archived = await service.archive(created.pageId)
    assert(archived.status === 'archived', 'expected archived status', archived)

    const restored = await service.restore(created.pageId)
    assert(restored.status === 'active', 'expected restored status', restored)

    // 关联到真实存在的页面（linkRelatedPages 校验对端存在）
    const related = await service.create({
      pageType: 'event',
      title: '相关页',
      summary: '被关联页面'
    })
    const linked = await service.linkRelatedPages(created.pageId, [related.pageId])
    assert(linked.relatedPageIds.includes(related.pageId), 'expected related page linked', linked)

    const versions = await service.listVersions(created.pageId)
    assert(versions.length >= 3, 'expected multiple versions created', versions)
  } finally {
    await harness.close()
  }
}

async function testTopicIndexLifecycle() {
  const harness = await createServiceHarness('topic-index')
  try {
    const topicIndex = await createTopicIndexStore(harness.baseDir)

    const entry = await topicIndex.upsert({
      keyword: '龙虾',
      aliases: ['lobster', '小龙虾'],
      dates: ['2026-06-27'],
      memoryPageIds: ['topic_lobster'],
      importance: 'high'
    })

    assert(entry.keyword === '龙虾', 'expected topic keyword', entry)

    const linked = await topicIndex.linkPage('龙虾', 'topic_food')
    assert(linked.memoryPageIds.includes('topic_food'), 'expected page linked into topic index', linked)

    const mergedSource = await topicIndex.upsert({
      keyword: '海鲜',
      aliases: ['龙虾'],
      dates: ['2026-06-30'],
      chatRefs: ['chat:2026-06-30']
    })
    assert(mergedSource.normalizedKey === '海鲜', 'expected source topic created', mergedSource)

    const merged = await topicIndex.mergeTopics({
      targetNormalizedKey: '龙虾',
      sourceNormalizedKey: '海鲜'
    })

    assert(merged.target.normalizedKey === '龙虾', 'expected target key preserved', merged)
    assert(merged.target.aliases.includes('海鲜'), 'expected source keyword moved into aliases', merged)
    assert(merged.removedSourceNormalizedKey === '海鲜', 'expected source topic removed', merged)
  } finally {
    await harness.close()
  }
}

const tests = [
  ['memory wiki lifecycle', testMemoryWikiLifecycle],
  ['topic index lifecycle', testTopicIndexLifecycle]
]

let passed = 0

for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS services - ${name}`)
}

console.log(`tests/services/memory-wiki-service.test.mjs: passed ${passed}/${tests.length}`)
