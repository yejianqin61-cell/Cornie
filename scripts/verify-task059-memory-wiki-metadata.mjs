import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-059-'))

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot })

    const created = await service.create({
      pageType: 'project',
      title: 'Cornie',
      summary: '初始摘要',
      aliases: ['Cornie Product'],
      importance: 'medium',
      body: '# Cornie'
    })

    await service.updateSummary(created.pageId, '更新后的摘要')
    await service.updateAliases(created.pageId, ['Cornie Product', '铃湾项目'])
    await service.setStatus(created.pageId, 'review')
    await service.setImportance(created.pageId, 'high')
    await service.setOwnerConfirmed(created.pageId, true)

    const fetched = await service.get(created.pageId)
    assert.equal(fetched?.summary, '更新后的摘要')
    assert.deepEqual(fetched?.aliases, ['Cornie Product', '铃湾项目'])
    assert.equal(fetched?.status, 'review')
    assert.equal(fetched?.importance, 'high')
    assert.equal(fetched?.ownerConfirmed, true)
    assert.equal(fetched?.body, '# Cornie')

    console.log('verify-task059-memory-wiki-metadata: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
