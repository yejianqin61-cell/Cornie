import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb } from '../electron/db.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { createObservationWikiLinkService } from '../electron/backend/observation/wikiLink.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-082-'))
  const dbPath = path.join(tempRoot, 'task082.sqlite')
  const store = await openDb(dbPath)

  try {
    const observationService = createObservationService(store)
    const memoryWikiService = await createMemoryWikiService({ baseDir: tempRoot })
    const linkService = createObservationWikiLinkService({ observationService, memoryWikiService })

    const observation = observationService.addNote({
      date: '2026-06-27',
      type: 'event',
      title: '提到龙虾',
      content: '主人今天又提到了龙虾'
    })
    const page = await memoryWikiService.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '长期主题',
      body: '# 龙虾'
    })

    const linked = await linkService.linkObservationToPage({
      observationId: observation.id,
      pageId: page.pageId
    })

    assert.equal(linked.sourceRefs.length, 1)
    assert.equal(linked.sourceRefs[0].kind, 'observation')
    assert.equal(linked.sourceRefs[0].observationId, observation.id)

    const linkedAgain = await linkService.linkObservationToPage({
      observationId: observation.id,
      pageId: page.pageId
    })
    assert.equal(linkedAgain.sourceRefs.length, 1)

    console.log('verify-task082-observation-wiki-link: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
