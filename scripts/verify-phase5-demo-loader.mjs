import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/service.js'
import { loadDemoMemorySet, resetDemoMemorySet } from '../electron/backend/memory-wiki/demoMemory.js'

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-phase5-demo-'))
  const userRoot = path.join(root, 'user')
  const demoRoot = path.join(root, 'demo')
  const userWiki = await createMemoryWikiService({ baseDir: userRoot })
  await userWiki.create({ pageId: 'user-page', pageType: 'topic', title: '真实用户页', body: 'keep me' })

  const first = await loadDemoMemorySet({ baseDir: demoRoot })
  assert.equal(first.createdCount, 4)
  const second = await loadDemoMemorySet({ baseDir: demoRoot })
  assert.equal(second.createdCount, 0)
  const reset = await resetDemoMemorySet({ baseDir: demoRoot })
  assert.equal(reset.deletedCount, 4)
  const afterReset = await createMemoryWikiService({ baseDir: demoRoot })
  assert.equal((await afterReset.listSummaries({})).length, 0)
  assert.equal((await userWiki.listSummaries({})).length, 1)
  const reloaded = await loadDemoMemorySet({ baseDir: demoRoot })
  assert.equal(reloaded.createdCount, 4)
  console.log('verify-phase5-demo-loader: passed')
}

main().catch((error) => {
  console.error('verify-phase5-demo-loader: failed')
  console.error(error?.stack ?? error)
  process.exitCode = 1
})
