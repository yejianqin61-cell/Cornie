import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createObservationService } from '../electron/backend/observation/service.js'
import { createMemoryWikiGovernanceStore } from '../electron/backend/memory-wiki/index.js'
import { registerObservationTools } from '../electron/backend/observation/tools.js'

async function run() {
  const harness = await createServiceHarness('task387-observation-compression-governance')

  try {
    const baseDir = harness.baseDir
    const store = harness.store
    const observation = createObservationService(store)
    const governanceStore = await createMemoryWikiGovernanceStore(baseDir)

    const first = observation.addNote({
      date: '2026-06-30',
      type: 'event',
      title: '提到龙虾晚饭',
      content: '今天晚饭又提到了龙虾，主人说龙虾很重要。',
      relatedRef: 'topic:龙虾',
      sourceText: '龙虾很重要'
    })
    const second = observation.addNote({
      date: '2026-06-30',
      type: 'event',
      title: '再次提到龙虾',
      content: '主人又说了一次龙虾对他来说很重要。',
      relatedRef: 'topic:龙虾',
      sourceText: '龙虾对他很重要'
    })

    const result = await observation.enqueueCompressionCandidates({
      baseDir,
      date: '2026-06-30',
      observations: [first, second]
    })

    assert(result.created.length === 1, '同日同主题 observation 应生成一条压缩治理候选')
    assert(result.created[0].requestType === 'observation_compression_candidate', '请求类型应正确')

    const listed = await governanceStore.list({ queueSection: 'observation_archive_candidates' })
    assert(listed.length >= 1, '压缩治理候选应进入治理队列')
    assert(listed[0].evidence.some((item) => item.observationId === first.id), '候选应保留第一条 observation 证据')
    assert(listed[0].evidence.some((item) => item.observationId === second.id), '候选应保留第二条 observation 证据')

    const duplicate = await observation.enqueueCompressionCandidates({
      baseDir,
      date: '2026-06-30',
      observations: [first, second]
    })
    assert(duplicate.created.length === 0, '重复执行不应重复入池')

    const tools = new Map()
    registerObservationTools(store, {
      registerTool(definition) {
        tools.set(definition.name, definition)
      }
    })
    assert(tools.has('observation.enqueue_compression_candidates'), '工具集应注册 observation.enqueue_compression_candidates')

    const toolRes = await tools.get('observation.enqueue_compression_candidates').handler({
      baseDir,
      date: '2026-06-30',
      observations: [first, second]
    })
    assert(toolRes.ok === true, '工具调用应返回 ok')

    console.log('verify-task387-observation-compression-governance: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
