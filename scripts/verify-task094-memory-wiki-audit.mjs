import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb } from '../electron/db.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-m11-094-'))
  const dbPath = path.join(tempRoot, 'task094.sqlite')
  const store = await openDb(dbPath)

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot, store })
    const page = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '重要主题',
      body: '# 龙虾'
    })

    await service.updateSummary(page.pageId, '主人经常提到龙虾')
    const versions = await service.listVersions(page.pageId)
    const beforeUpdate = versions.find((item) => item.reason === 'before_update')
    assert.ok(beforeUpdate)
    await service.rollback(page.pageId, beforeUpdate.versionId)

    const events = await service.listAuditEvents({ limit: 10 })
    assert.ok(events.some((item) => item.eventType === 'page_created'))
    assert.ok(events.some((item) => item.eventType === 'page_updated'))
    assert.ok(events.some((item) => item.eventType === 'page_rolled_back'))

    console.log('verify-task094-memory-wiki-audit: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
