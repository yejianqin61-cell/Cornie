import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerMemoryWikiTools } from '../electron/backend/memory-wiki/tools.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-gov-106-'))

  try {
    await registerMemoryWikiTools({ baseDir: tempRoot }, { registerTool })

    const createRequest = getTool('memory_governance.create_request')
    const getRequest = getTool('memory_governance.get_request')
    const listRequests = getTool('memory_governance.list_requests')
    const updateRequestStatus = getTool('memory_governance.update_request_status')

    assert.ok(createRequest)
    assert.ok(getRequest)
    assert.ok(listRequests)
    assert.ok(updateRequestStatus)

    const created = await createRequest.handler({
      requestType: 'archive_candidate',
      triggerSource: 'dialogue',
      queueSection: 'archive_candidates',
      pageIds: ['topic_lobster'],
      topicKeys: ['龙虾'],
      title: '龙虾页面可进入低频层',
      reason: '长期未提及',
      evidence: [{ kind: 'staleness', days: 120 }]
    })

    assert.equal(created.result.status, 'pending')

    const fetched = await getRequest.handler({ requestId: created.result.requestId })
    assert.equal(fetched.result.requestId, created.result.requestId)

    const listed = await listRequests.handler({ status: 'pending', queueSection: 'archive_candidates' })
    assert.equal(listed.result.length, 1)

    const updated = await updateRequestStatus.handler({
      requestId: created.result.requestId,
      status: 'approved'
    })
    assert.equal(updated.result.status, 'approved')

    const approvedList = await listRequests.handler({ status: 'approved' })
    assert.equal(approvedList.result.length, 1)

    console.log('verify-task106-memory-governance-tools: passed')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
