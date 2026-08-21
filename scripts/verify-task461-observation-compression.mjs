import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createObservationService } from '../electron/backend/observation/service.js'
import { enqueueObservationCompressionCandidates } from '../electron/backend/observation/governance.js'
import { createMemoryWikiService, createMemoryWikiAuditStore } from '../electron/backend/memory-wiki/index.js'

async function run() {
  const harness = await createServiceHarness('task461-observation-compression')

  try {
    const observation = createObservationService(harness.store)
    const memoryWiki = await createMemoryWikiService({
      baseDir: harness.baseDir,
      store: harness.store
    })

    // 1) 造同日同主题的 3 条观察（同 relatedRef 归为同一 topic）
    const created = []
    for (const text of ['今天写完了记忆提炼轮次', '提炼轮次联调通过', '还给提炼轮次写了验收脚本']) {
      const result = observation.addNoteSmart({
        date: '2026-08-21',
        type: 'event',
        title: text.slice(0, 8),
        content: text,
        relatedRef: '2026-08-21#conv-compress',
        sourceText: text
      })
      assert(result.action === 'created', '观察应创建成功')
      created.push(result.note)
    }

    // 2) 入队压缩候选
    const enqueueResult = await enqueueObservationCompressionCandidates(harness.store, {
      baseDir: harness.baseDir,
      date: '2026-08-21',
      observations: created
    })
    assert(enqueueResult.created.length >= 1, '应生成压缩候选', enqueueResult)
    const request = enqueueResult.created[0]
    assert(request.requestType === 'observation_compression_candidate', '候选类型应为压缩候选')

    // 3) 批准并执行压缩
    const applyResult = await memoryWiki.applyGovernanceUpgradeRequest(request.requestId)
    assert(applyResult.request.status === 'approved', '压缩应用后状态应 approved')
    assert(applyResult.summary, '应生成压缩摘要观察')
    assert(applyResult.summary.type === 'summary', '摘要观察类型应为 summary')
    assert(applyResult.archivedIds.length === 3, '应归档 3 条原始观察')

    // 4) 原始条目已删除，摘要保留信息
    const remaining = observation.listByDate('2026-08-21')
    assert(remaining.length === 1, '压缩后当天应只剩摘要观察')
    assert(remaining[0].id === applyResult.summary.id, '剩余观察应为摘要')
    assert(String(remaining[0].sourceText).includes('记忆提炼轮次'), '摘要应保留原始信息')

    // 5) 审计事件
    const auditStore = await createMemoryWikiAuditStore(harness.baseDir)
    const events = await auditStore.list({ limit: 50 })
    assert(
      events.some((item) => item.eventType === 'observation_compression_applied'),
      '应存在压缩审计事件'
    )

    console.log('verify-task461-observation-compression: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
