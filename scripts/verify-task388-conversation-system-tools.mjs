import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb, saveMessage } from '../electron/db.js'
import { registerSystemTools } from '../electron/backend/system/tools.js'
import { clearTools, getTool, registerTool } from '../electron/backend/tools/registry.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-system-tools-388-'))
  const dbPath = path.join(tempRoot, 'task388.sqlite')
  const store = await openDb(dbPath)

  try {
    saveMessage(store, {
      id: 'msg-1',
      date: '2026-06-27',
      role: 'user',
      content: '今天聊到了龙虾和考试'
    })
    saveMessage(store, {
      id: 'msg-2',
      date: '2026-06-27',
      role: 'assistant',
      content: '铃湾记下来了'
    })
    saveMessage(store, {
      id: 'msg-3',
      date: '2026-06-28',
      role: 'user',
      content: '继续聊龙虾'
    })

    clearTools()
    registerSystemTools(store, { registerTool })

    const listHistoryTool = getTool('conversation.list_history_dates')
    const getDayPageTool = getTool('conversation.get_day_page')
    const exportMonthTool = getTool('conversation.export_month_record')

    assert.ok(listHistoryTool)
    assert.ok(getDayPageTool)
    assert.ok(exportMonthTool)

    const historyRes = await listHistoryTool.handler({ scope: 'month', month: '2026-06', limit: 10, cursor: 0 })
    assert.equal(historyRes.ok, true)
    assert.equal(historyRes.result.filters.scope, 'month')
    assert.equal(historyRes.result.archiveScope.month, '2026-06')
    assert.equal(historyRes.result.entries.length, 2)

    const dayPageRes = await getDayPageTool.handler({ date: '2026-06-27', limit: 1, cursor: 0 }, { date: '2026-06-27' })
    assert.equal(dayPageRes.ok, true)
    assert.equal(dayPageRes.result.items.length, 1)
    assert.equal(dayPageRes.result.context.total, 2)
    assert.equal(dayPageRes.result.hasMore, true)

    const exportRes = await exportMonthTool.handler({ month: '2026-06', format: 'json' })
    assert.equal(exportRes.ok, true)
    assert.equal(exportRes.result.meta.month, '2026-06')
    assert.equal(exportRes.result.meta.dayCount, 2)

    console.log('verify-task388-conversation-system-tools: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
