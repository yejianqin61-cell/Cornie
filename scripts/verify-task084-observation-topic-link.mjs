import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb } from '../electron/db.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { createObservationTopicLinkService } from '../electron/backend/observation/topicLink.js'
import { createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-observation-084-'))
  const dbPath = path.join(tempRoot, 'task084.sqlite')
  const store = await openDb(dbPath)

  try {
    const observationService = createObservationService(store)
    const topicIndex = await createTopicIndexStore(tempRoot)
    const topicLink = createObservationTopicLinkService({ observationService, topicIndex })

    const observation = observationService.addNote({
      date: '2026-06-27',
      type: 'event',
      title: '提到龙虾',
      content: '主人今天提到龙虾，而且明显觉得很重要'
    })

    const result = await topicLink.linkObservationToTopic({
      observationId: observation.id,
      keyword: '龙虾',
      aliases: ['lobster'],
      importance: 'high',
      note: '反复出现的主题',
      pageId: 'topic_lobster'
    })

    assert.equal(result.entry.normalizedKey, '龙虾')
    assert.deepEqual(result.entry.dates, ['2026-06-27'])
    assert.deepEqual(result.entry.memoryPageIds, ['topic_lobster'])
    assert.equal(result.entry.importance, 'high')
    assert.deepEqual(result.entry.observationRefs, [`2026-06-27#${observation.id}`])

    const fetched = await topicIndex.get('龙虾')
    assert.equal(fetched?.note, '反复出现的主题')
    assert.deepEqual(fetched?.aliases, ['lobster'])

    console.log('verify-task084-observation-topic-link: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
