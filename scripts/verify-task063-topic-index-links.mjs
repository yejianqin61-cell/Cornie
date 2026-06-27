import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-topic-index-063-'))

  try {
    const store = await createTopicIndexStore(tempRoot)
    await store.upsert({
      keyword: '龙虾',
      aliases: ['lobster']
    })

    await store.addDateRef('龙虾', '2026-06-27')
    await store.addDateRef('龙虾', '2026-06-30')
    await store.addDateRef('龙虾', '2026-06-27')
    await store.linkPage('龙虾', 'topic_lobster')
    await store.linkPage('龙虾', 'topic_lobster')
    await store.addChatRef('龙虾', 'conversation:2026-06-27')
    await store.addObservationRef('龙虾', 'observation:obs-001')

    const fetched = await store.get('龙虾')
    assert.deepEqual(fetched?.dates, ['2026-06-27', '2026-06-30'])
    assert.deepEqual(fetched?.memoryPageIds, ['topic_lobster'])
    assert.deepEqual(fetched?.chatRefs, ['conversation:2026-06-27'])
    assert.deepEqual(fetched?.observationRefs, ['observation:obs-001'])

    console.log('verify-task063-topic-index-links: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
