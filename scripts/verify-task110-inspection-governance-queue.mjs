import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb } from '../electron/db.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-110-'))
  const dbPath = path.join(tempRoot, 'task110.sqlite')
  const store = await openDb(dbPath)

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot, store })
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
    assert.ok(enqueued.createdCount >= 2)

    const repairSuggestions = await service.listGovernanceRequests({ queueSection: 'repair_suggestions' })
    assert.ok(repairSuggestions.length >= 1)
    assert.ok(repairSuggestions.every((item) => item.requestType === 'repair_suggestion'))

    const archiveCandidates = await service.listGovernanceRequests({ queueSection: 'archive_candidates' })
    assert.ok(archiveCandidates.length >= 1)
    assert.ok(archiveCandidates.some((item) => item.pageIds.includes(orphan.pageId)))

    console.log('verify-task110-inspection-governance-queue: passed')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
