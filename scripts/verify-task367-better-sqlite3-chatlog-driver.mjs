import { randomUUID } from 'node:crypto'

import { openDb, saveMessage } from '../electron/db.js'
import {
  CHATLOG_REPOSITORY_DRIVERS,
  createBetterSqlite3ChatlogRepository,
  createChatlogRepository
} from '../electron/backend/chatlog/repository.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'
import { cleanupSqliteFile, createRuntimeSqlitePath } from './tmp-artifacts.mjs'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function cleanupSqliteFileSafely(dbPath) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      cleanupSqliteFile(dbPath)
      return
    } catch (error) {
      if (error?.code !== 'EBUSY' || attempt === 2) {
        if (error?.code === 'EBUSY') {
          console.warn(`cleanup skipped due to busy sqlite handle: ${dbPath}`)
          return
        }
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, 80))
    }
  }
}

async function run() {
  const dbPath = await createRuntimeSqlitePath(`task367-better-sqlite3-${randomUUID()}`)
  await cleanupSqliteFileSafely(dbPath)
  const store = await openDb(dbPath)
  let repository = null
  let viaFactory = null

  try {
    saveMessage(store, {
      id: 'chat-1',
      date: '2026-06-28',
      role: 'user',
      content: '钟奕菲今天又出现在我的回忆里。'
    })
    saveMessage(store, {
      id: 'chat-2',
      date: '2026-06-28',
      role: 'cornie',
      content: '小铃湾会陪你一起记着。'
    })
    saveMessage(store, {
      id: 'chat-3',
      date: '2026-06-30',
      role: 'user',
      content: '今天聊龙虾，也聊到了钟奕菲。'
    })

    repository = createBetterSqlite3ChatlogRepository({ dbPath })
    assert(repository.driver === CHATLOG_REPOSITORY_DRIVERS.betterSqlite3, '应创建真实 better-sqlite3 repository')
    assert(repository.capabilities.status === 'active', 'better-sqlite3 driver 应标记为 active')
    assert(repository.capabilities.supportsNativePaging === true, 'better-sqlite3 driver 应声明原生分页能力')

    const dayMessages = repository.getMessagesByDate('2026-06-28')
    assert(dayMessages.length === 2, 'better-sqlite3 repository 应能按日读取消息')

    const matchedMessages = repository.searchMessagesByDate('2026-06-30', '钟奕菲')
    assert(matchedMessages.length === 1, 'better-sqlite3 repository 应能按关键字检索单日消息')
    assert(Boolean(matchedMessages[0].matchedPreview), '关键字检索结果应带 matchedPreview')

    const monthEntries = repository.listDateEntries({
      month: '2026-06',
      scope: 'month',
      limit: 10,
      cursor: 0
    })
    assert(monthEntries.entries.length === 2, 'better-sqlite3 repository 应能返回月份日期列表')

    const keywordEntries = repository.listDateEntries({
      scope: 'all',
      query: '钟奕菲',
      limit: 10,
      cursor: 0
    })
    assert(keywordEntries.entries.length === 2, 'better-sqlite3 repository 应能返回跨日期关键字命中结果')
    assert(keywordEntries.entries.every((item) => item.matchedCount >= 1), '关键字命中结果应带 matchedCount')

    viaFactory = createChatlogRepository(store, {
      driver: CHATLOG_REPOSITORY_DRIVERS.betterSqlite3
    })
    assert(viaFactory.driver === CHATLOG_REPOSITORY_DRIVERS.betterSqlite3, 'factory 应可基于 store.dbPath 创建 better-sqlite3 repository')

    const chatlogService = createChatlogService(store, {
      driver: CHATLOG_REPOSITORY_DRIVERS.betterSqlite3
    })
    const dayRecord = chatlogService.getByDate('2026-06-28', { limit: 1, cursor: 0 })
    assert(dayRecord.storage.driver === CHATLOG_REPOSITORY_DRIVERS.betterSqlite3, 'chatlog service 应可切到 better-sqlite3 驱动')
    assert(dayRecord.pagination.hasMore === true, 'better-sqlite3 驱动下分页元信息应可用')

    const dateList = chatlogService.listDates({
      scope: 'all',
      query: '钟奕菲',
      limit: 10,
      cursor: 0
    })
    assert(dateList.entries.length === 2, 'chatlog service 应兼容 better-sqlite3 关键字检索')

    console.log('verify-task367-better-sqlite3-chatlog-driver: ok')
  } finally {
    try {
      repository?.close?.()
    } catch {}
    try {
      viaFactory?.close?.()
    } catch {}
    try {
      store.close()
    } catch {}
    await cleanupSqliteFileSafely(dbPath)
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
