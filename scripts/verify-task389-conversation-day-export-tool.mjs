import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb, saveMessage } from '../electron/db.js'
import { registerSystemTools } from '../electron/backend/system/tools.js'
import { clearTools, getTool, registerTool } from '../electron/backend/tools/registry.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-system-tools-389-'))
  const dbPath = path.join(tempRoot, 'task389.sqlite')
  const store = await openDb(dbPath)

  try {
    saveMessage(store, {
      id: 'msg-1',
      date: '2026-06-27',
      role: 'user',
      content: '今天买了龙虾'
    })
    saveMessage(store, {
      id: 'msg-2',
      date: '2026-06-27',
      role: 'assistant',
      content: '铃湾帮你记下来了'
    })

    clearTools()
    registerSystemTools(store, { registerTool })

    const exportDayTool = getTool('conversation.export_day_record')
    assert.ok(exportDayTool)

    const explicitRes = await exportDayTool.handler({ date: '2026-06-27', format: 'json' }, { date: '2026-06-28' })
    assert.equal(explicitRes.ok, true)
    assert.equal(explicitRes.result.meta.date, '2026-06-27')
    assert.equal(explicitRes.result.meta.messageCount, 2)

    const fallbackRes = await exportDayTool.handler({ format: 'txt' }, { date: '2026-06-27' })
    assert.equal(fallbackRes.ok, true)
    assert.equal(fallbackRes.result.format, 'txt')
    assert.equal(fallbackRes.result.meta.date, '2026-06-27')
    assert.match(fallbackRes.result.content, /龙虾/)

    console.log('verify-task389-conversation-day-export-tool: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
