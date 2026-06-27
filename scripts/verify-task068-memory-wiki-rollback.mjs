import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-068-'))

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot })

    const created = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '第一版摘要',
      body: '# 龙虾\n\n第一版正文'
    })

    const updated = await service.update({
      pageId: created.pageId,
      summary: '第二版摘要',
      body: '# 龙虾\n\n第二版正文'
    })

    const versions = await service.listVersions(created.pageId)
    const beforeUpdateVersion = versions.find((item) => item.reason === 'before_update')
    assert.ok(beforeUpdateVersion)

    const rolledBack = await service.rollback(created.pageId, beforeUpdateVersion.versionId)
    assert.equal(rolledBack.summary, '第一版摘要')
    assert.equal(rolledBack.body, '# 龙虾\n\n第一版正文')

    const afterRollback = await service.get(created.pageId)
    assert.equal(afterRollback?.summary, '第一版摘要')

    const finalVersions = await service.listVersions(created.pageId)
    assert.ok(finalVersions.some((item) => item.reason === 'before_rollback'))
    assert.ok(finalVersions.some((item) => item.reason === 'after_rollback'))

    console.log('verify-task068-memory-wiki-rollback: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
