import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { saveMessage } from '../electron/db.js'
import {
  CHATLOG_REPOSITORY_DRIVERS,
  createBetterSqlite3ChatlogRepositorySkeleton,
  createChatlogRepository
} from '../electron/backend/chatlog/repository.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'

async function run() {
  const harness = await createServiceHarness('task363-chatlog-repository-driver-skeleton')

  try {
    saveMessage(harness.store, {
      id: 'chat-1',
      date: '2026-06-30',
      role: 'user',
      content: '你好，铃湾'
    })

    const defaultRepository = createChatlogRepository(harness.store)
    assert(defaultRepository.driver === CHATLOG_REPOSITORY_DRIVERS.sqljs, '默认应使用 sql.js repository')
    assert(defaultRepository.capabilities.migrationReady === true, 'sql.js repository 应声明已接入可迁移契约')

    const betterSqlite3Skeleton = createBetterSqlite3ChatlogRepositorySkeleton()
    assert(betterSqlite3Skeleton.driver === CHATLOG_REPOSITORY_DRIVERS.betterSqlite3, '应暴露 better-sqlite3 驱动骨架')
    assert(betterSqlite3Skeleton.capabilities.status === 'planned', 'better-sqlite3 骨架应显式标记为 planned')
    assert(typeof betterSqlite3Skeleton.getMessagesByDate === 'function', '骨架应保持统一 repository 形状')

    const chatlog = createChatlogService(harness.store)
    const dayRecord = chatlog.getByDate('2026-06-30')
    assert(dayRecord.storage.driver === CHATLOG_REPOSITORY_DRIVERS.sqljs, '现有 chatlog service 应继续通过 sql.js 提供服务')
    assert(dayRecord.storage.availableDrivers.includes(CHATLOG_REPOSITORY_DRIVERS.betterSqlite3), 'storage meta 应暴露未来可切换驱动')
    assert(dayRecord.storage.driverCapabilities?.migrationReady === true, 'storage meta 应暴露当前驱动迁移就绪信息')

    let unsupportedError = null
    try {
      createChatlogRepository(harness.store, { driver: 'unknown-driver' })
    } catch (error) {
      unsupportedError = error
    }
    assert(Boolean(unsupportedError), '未知驱动应明确报错')

    console.log('verify-task363-chatlog-repository-driver-skeleton: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
