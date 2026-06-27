import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb } from '../electron/db.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { createObservationWikiLinkService } from '../electron/backend/observation/wikiLink.js'
import { createObservationTopicLinkService } from '../electron/backend/observation/topicLink.js'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-observation-085-'))
  const dbPath = path.join(tempRoot, 'task085.sqlite')
  const store = await openDb(dbPath)

  try {
    const observationService = createObservationService(store)
    const memoryWikiService = await createMemoryWikiService({ baseDir: tempRoot })
    const topicIndex = await createTopicIndexStore(tempRoot)
    const wikiLink = createObservationWikiLinkService({ observationService, memoryWikiService })
    const topicLink = createObservationTopicLinkService({ observationService, topicIndex })

    const page = await memoryWikiService.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '反复被提及的主题',
      body: '# 龙虾'
    })

    const first = observationService.addNoteSmart({
      date: '2026-06-27',
      type: 'event',
      title: '提到龙虾',
      content: '主人今天提到龙虾很好吃'
    })

    const second = observationService.addNoteSmart({
      date: '2026-06-27',
      type: 'event',
      title: '提到龙虾',
      content: '主人今天提到龙虾很好吃，而且希望铃湾记住它'
    })

    assert.equal(second.action, 'merged')
    assert.equal(observationService.listByDate('2026-06-27').length, 1)

    const linkedPage = await wikiLink.linkObservationToPage({
      observationId: first.note.id,
      pageId: page.pageId
    })

    assert.equal(linkedPage.sourceRefs.length, 1)

    const linkedTopic = await topicLink.linkObservationToTopic({
      observationId: first.note.id,
      keyword: '龙虾',
      aliases: ['lobster'],
      importance: 'high',
      pageId: page.pageId
    })

    assert.deepEqual(linkedTopic.entry.dates, ['2026-06-27'])
    assert.deepEqual(linkedTopic.entry.memoryPageIds, [page.pageId])
    assert.equal(linkedTopic.entry.observationRefs.length, 1)

    console.log('verify-task085-m8-observation-module: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
