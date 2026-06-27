import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-107-'))

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot })

    const created = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '长期主题',
      body: '# 龙虾'
    })

    assert.equal(created.status, 'active')

    const inactive = await service.demote(created.pageId)
    assert.equal(inactive.status, 'inactive')

    const fetchedInactive = await service.get(created.pageId)
    assert.equal(fetchedInactive?.status, 'inactive')

    const inactiveList = await service.list({ status: 'inactive' })
    assert.equal(inactiveList.length, 1)
    assert.equal(inactiveList[0].pageId, created.pageId)

    const archived = await service.archive(created.pageId)
    assert.equal(archived.status, 'archived')

    const archivedList = await service.list({ status: 'archived' })
    assert.equal(archivedList.length, 1)

    const restored = await service.restore(created.pageId)
    assert.equal(restored.status, 'active')

    const activeList = await service.list({ status: 'active' })
    assert.equal(activeList.length, 1)
    assert.equal(activeList[0].pageId, created.pageId)

    console.log('verify-task107-memory-wiki-status-tiers: passed')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
