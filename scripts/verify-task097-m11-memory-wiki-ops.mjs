import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb } from '../electron/db.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-m11-097-'))
  const dbPath = path.join(tempRoot, 'task097.sqlite')
  const store = await openDb(dbPath)

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot, store })
    const topicIndex = service.getTopicIndex()

    const page = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '长期主题',
      body: '# 龙虾'
    })

    await topicIndex.upsert({
      keyword: '龙虾',
      memoryPageIds: [page.pageId]
    })

    const auditEvents = await service.listAuditEvents()
    const brokenLinks = await service.inspectBrokenLinks()
    const orphanPages = await service.inspectOrphanPages()

    assert.ok(auditEvents.length >= 1)
    assert.equal(brokenLinks.issueCount, 0)
    assert.equal(orphanPages.orphanCount, 0)

    console.log('verify-task097-m11-memory-wiki-ops: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
