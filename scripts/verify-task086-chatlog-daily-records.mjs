import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb, saveMessage } from '../electron/db.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-chatlog-086-'))
  const dbPath = path.join(tempRoot, 'task086.sqlite')
  const store = await openDb(dbPath)

  try {
    saveMessage(store, {
      id: 'msg-user-1',
      date: '2026-06-27',
      role: 'user',
      content: '今天我们聊到龙虾'
    })
    saveMessage(store, {
      id: 'msg-cornie-1',
      date: '2026-06-27',
      role: 'cornie',
      content: '铃湾记住了龙虾'
    })
    saveMessage(store, {
      id: 'msg-user-2',
      date: '2026-06-28',
      role: 'user',
      content: '今天我们聊到记账'
    })

    const chatlog = createChatlogService(store)
    const today = chatlog.getByDate('2026-06-27')
    assert.equal(today.messages.length, 2)
    assert.equal(today.messages[0].id, 'msg-user-1')
    assert.equal(today.messages[1].id, 'msg-cornie-1')

    const dates = chatlog.listDates({})
    assert.equal(dates.entries.length, 2)
    assert.equal(dates.entries[0].date, '2026-06-28')

    const search = chatlog.searchDatesByKeyword('龙虾')
    assert.equal(search.entries.length, 1)
    assert.equal(search.entries[0].date, '2026-06-27')
    assert.deepEqual(search.entries[0].matchedMessageIds, ['msg-user-1', 'msg-cornie-1'])

    console.log('verify-task086-chatlog-daily-records: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
