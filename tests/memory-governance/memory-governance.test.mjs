import { createMemoryWikiService } from '../../electron/backend/memory-wiki/service.js'
import { calculateTopicHeat, createTopicIndexStore } from '../../electron/backend/memory-wiki/topicIndex.js'
import { createServiceHarness, assert } from '../shared/service-harness.mjs'

async function testMergeMovesSourcesAndArchivesOrigin() {
  const harness = await createServiceHarness('memory-governance-merge')
  try {
    const service = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })

    const target = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '长期主题',
      body: '# 龙虾',
      sourceRefs: [{ type: 'chat', ref: '2026-06-27' }]
    })
    const source = await service.create({
      pageType: 'topic',
      title: '澳洲龙虾',
      summary: '疑似重复页',
      body: '# 澳洲龙虾',
      sourceRefs: [{ type: 'chat', ref: '2026-06-30' }]
    })

    const merged = await service.mergePages({
      targetPageId: target.pageId,
      sourcePageId: source.pageId
    })

    assert(merged.target.pageId === target.pageId, 'expected merge keep target page id', merged)
    assert(
      merged.target.sourceRefs.some((item) => item.ref === '2026-06-27') &&
        merged.target.sourceRefs.some((item) => item.ref === '2026-06-30'),
      'expected merge carry both source refs',
      merged
    )

    const archivedSource = await service.get(source.pageId)
    assert(archivedSource?.status === 'archived', 'expected source page archived after merge', archivedSource)
  } finally {
    await harness.close()
  }
}

async function testRollbackAndCompressionConsistency() {
  const harness = await createServiceHarness('memory-governance-rollback')
  try {
    const service = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })

    const page = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '原始摘要',
      body: '# 龙虾\n\n第一段。\n\n第二段。'
    })

    const compressed = await service.compressPage({
      pageId: page.pageId,
      summary: '压缩后摘要',
      body: '# 龙虾\n\n阶段总结。'
    })
    assert(compressed.summary === '压缩后摘要', 'expected compressed summary', compressed)

    const versions = await service.listVersions(page.pageId)
    const beforeCompression = versions.find((item) => item.reason === 'before_compression')
    assert(beforeCompression?.versionId, 'expected before_compression version exists', versions)

    const rolledBack = await service.rollback(page.pageId, beforeCompression.versionId)
    assert(rolledBack.summary === '原始摘要', 'expected rollback restore original summary', rolledBack)

    const auditEvents = await service.listAuditEvents({ limit: 20 })
    assert(auditEvents.some((item) => item.eventType === 'page_compressed'), 'expected compression audit event', auditEvents)
    assert(auditEvents.some((item) => item.eventType === 'page_rolled_back'), 'expected rollback audit event', auditEvents)
  } finally {
    await harness.close()
  }
}

async function testInactiveAndArchivedLifecycle() {
  const harness = await createServiceHarness('memory-governance-status')
  try {
    const service = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })

    const page = await service.create({
      pageType: 'topic',
      title: '龙虾',
      body: '# 龙虾'
    })

    const inactive = await service.demote(page.pageId)
    assert(inactive.status === 'inactive', 'expected demoted page inactive', inactive)

    const archived = await service.archive(page.pageId)
    assert(archived.status === 'archived', 'expected archived page status', archived)

    const restored = await service.restore(page.pageId)
    assert(restored.status === 'active', 'expected restored page active', restored)
  } finally {
    await harness.close()
  }
}

async function testTopicHeatDecayOrdering() {
  const harness = await createServiceHarness('memory-governance-heat')
  try {
    const topicIndex = await createTopicIndexStore(harness.baseDir)

    const recentHeat = calculateTopicHeat(
      {
        keyword: '龙虾',
        dates: ['2026-06-27', '2026-06-26'],
        importance: 'high'
      },
      { now: new Date('2026-06-27T12:00:00.000Z') }
    )
    const staleHeat = calculateTopicHeat(
      {
        keyword: '旧话题',
        dates: ['2026-02-01'],
        importance: 'high'
      },
      { now: new Date('2026-06-27T12:00:00.000Z') }
    )

    assert(recentHeat.heatScore > staleHeat.heatScore, 'expected recent topic hotter than stale one', {
      recentHeat,
      staleHeat
    })

    await topicIndex.upsert({
      keyword: '旧话题',
      dates: ['2026-02-01'],
      importance: 'high'
    })
    await topicIndex.upsert({
      keyword: '龙虾',
      dates: ['2026-06-27', '2026-06-26'],
      importance: 'high',
      memoryPageIds: ['topic_lobster']
    })

    const listed = await topicIndex.list()
    assert(listed[0].keyword === '龙虾', 'expected hot topic ranked first', listed)
    assert(typeof listed[0].heatScore === 'number', 'expected heatScore present', listed[0])
  } finally {
    await harness.close()
  }
}

async function testInspectionRequestsEnqueued() {
  const harness = await createServiceHarness('memory-governance-queue')
  try {
    const service = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
    const topicIndex = service.getTopicIndex()

    const orphan = await service.create({
      pageType: 'topic',
      title: '龙虾',
      status: 'active',
      body: '# 龙虾'
    })

    await topicIndex.upsert({
      keyword: '坏链接话题',
      memoryPageIds: ['missing_page_001']
    })

    const enqueued = await service.enqueueInspectionGovernanceRequests()
    assert(enqueued.createdCount >= 2, 'expected broken-link and orphan requests created', enqueued)

    const repairSuggestions = await service.listGovernanceRequests({ queueSection: 'repair_suggestions' })
    assert(repairSuggestions.length >= 1, 'expected repair suggestions queued', repairSuggestions)

    const archiveCandidates = await service.listGovernanceRequests({ queueSection: 'archive_candidates' })
    assert(
      archiveCandidates.some((item) => item.pageIds.includes(orphan.pageId)),
      'expected orphan page queued as archive candidate',
      archiveCandidates
    )
  } finally {
    await harness.close()
  }
}

const tests = [
  ['merge moves sources and archives origin', testMergeMovesSourcesAndArchivesOrigin],
  ['rollback and compression consistency', testRollbackAndCompressionConsistency],
  ['inactive and archived lifecycle', testInactiveAndArchivedLifecycle],
  ['topic heat decay ordering', testTopicHeatDecayOrdering],
  ['inspection requests enqueued', testInspectionRequestsEnqueued]
]

let passed = 0

for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS memory-governance - ${name}`)
}

console.log(`tests/memory-governance/memory-governance.test.mjs: passed ${passed}/${tests.length}`)
