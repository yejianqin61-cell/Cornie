import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMemoryWikiService, createMemoryWikiVersionStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-066-'))

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot })
    const versionStore = await createMemoryWikiVersionStore(tempRoot)

    const created = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '初始摘要',
      body: '# 龙虾\n\n初始内容'
    })

    const snapshot = await versionStore.snapshotPage(created, { reason: 'before_update' })
    assert.equal(snapshot.pageId, created.pageId)
    assert.equal(snapshot.reason, 'before_update')
    assert.ok(snapshot.snapshotPath.endsWith('.json'))

    const versionList = await versionStore.listPageVersions(created.pageId)
    assert.equal(versionList.length, 1)
    assert.equal(versionList[0].reason, 'before_update')

    const snapshotText = await fs.readFile(snapshot.snapshotPath, 'utf8')
    const snapshotJson = JSON.parse(snapshotText)
    assert.equal(snapshotJson.pageSnapshot.title, '龙虾')
    assert.equal(snapshotJson.pageSnapshot.body, '# 龙虾\n\n初始内容')

    console.log('verify-task066-memory-wiki-versions: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
