import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb } from '../electron/db.js'
import { createObservationService } from '../electron/backend/observation/service.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-observation-083-'))
  const dbPath = path.join(tempRoot, 'task083.sqlite')
  const store = await openDb(dbPath)

  try {
    const observationService = createObservationService(store)

    const created = observationService.addNoteSmart({
      date: '2026-06-27',
      type: 'event',
      title: '提到龙虾',
      content: '主人今天提到龙虾很好吃'
    })

    assert.equal(created.action, 'created')

    const duplicate = observationService.addNoteSmart({
      date: '2026-06-27',
      type: 'event',
      title: '提到龙虾',
      content: '主人今天提到龙虾很好吃'
    })

    assert.equal(duplicate.action, 'duplicate')
    assert.equal(observationService.listByDate('2026-06-27').length, 1)

    const merged = observationService.addNoteSmart({
      date: '2026-06-27',
      type: 'event',
      title: '提到龙虾',
      content: '主人今天提到龙虾很好吃，而且说这件事很重要'
    })

    assert.equal(merged.action, 'merged')
    const todayItems = observationService.listByDate('2026-06-27')
    assert.equal(todayItems.length, 1)
    assert.match(todayItems[0].content, /很重要/)

    console.log('verify-task083-observation-dedupe: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
