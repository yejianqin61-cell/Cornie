import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb, saveMessage } from '../electron/db.js'
import { registerObservationTools } from '../electron/backend/observation/tools.js'
import { registerSystemTools } from '../electron/backend/system/tools.js'
import { getTool, registerTool } from '../electron/backend/tools/registry.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-context-091-'))
  const dbPath = path.join(tempRoot, 'task091.sqlite')
  const store = await openDb(dbPath)

  try {
    saveMessage(store, {
      id: 'msg-user-1',
      date: '2026-06-27',
      role: 'user',
      content: '今天我们聊到龙虾'
    })

    registerObservationTools(store, { registerTool })
    registerSystemTools(store, { registerTool })

    const getDayRecordTool = getTool('conversation.get_day_record')
    const searchDayRecordsTool = getTool('conversation.search_day_records')
    const observationDayTool = getTool('observation.get_day_record')

    assert.ok(getDayRecordTool)
    assert.ok(searchDayRecordsTool)
    assert.ok(observationDayTool)

    const dayRecord = await getDayRecordTool.handler({ date: '2026-06-27' }, { date: '2026-06-27' })
    assert.equal(dayRecord.result.messages.length, 1)

    const searchResult = await searchDayRecordsTool.handler({ keyword: '龙虾' })
    assert.equal(searchResult.result.entries.length, 1)

    const observationResult = await observationDayTool.handler({ date: '2026-06-27' }, { date: '2026-06-27' })
    assert.deepEqual(observationResult.result.items, [])

    console.log('verify-task091-context-readonly-tools: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
