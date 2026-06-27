import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMemoryWikiGovernanceStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-gov-105-'))

  try {
    const store = await createMemoryWikiGovernanceStore(tempRoot)

    const created = await store.create({
      requestType: 'merge_candidate',
      triggerSource: 'inspection',
      queueSection: 'merge_candidates',
      riskLevel: 'high',
      pageIds: ['topic_lobster', 'topic_australian_lobster'],
      topicKeys: ['龙虾'],
      title: '龙虾页面疑似重复',
      reason: '别名重叠且来源高度相似',
      evidence: [{ kind: 'alias_overlap', score: 0.92 }]
    })

    assert.ok(created.requestId)
    assert.equal(created.status, 'pending')

    const fetched = await store.get(created.requestId)
    assert.equal(fetched?.requestId, created.requestId)
    assert.equal(fetched?.queueSection, 'merge_candidates')

    const pendingList = await store.list({ status: 'pending' })
    assert.equal(pendingList.length, 1)

    const mergeList = await store.list({ requestType: 'merge_candidate', triggerSource: 'inspection' })
    assert.equal(mergeList.length, 1)

    const deferred = await store.updateStatus(created.requestId, 'deferred')
    assert.equal(deferred.status, 'deferred')

    const deferredList = await store.list({ status: 'deferred' })
    assert.equal(deferredList.length, 1)

    console.log('verify-task105-memory-governance-store: passed')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
