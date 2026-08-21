import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { saveMessage } from '../electron/db.js'
import { CHATLOG_REPOSITORY_DRIVERS, createChatlogRepository } from '../electron/backend/chatlog/repository.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'

async function run() {
  const harness = await createServiceHarness('task396-chatlog-runtime-driver-switch')

  try {
    saveMessage(harness.store, {
      id: 'chat-1',
      date: '2026-06-30',
      role: 'user',
      content: '今天继续聊钟奕菲。'
    })
    saveMessage(harness.store, {
      id: 'chat-2',
      date: '2026-06-30',
      role: 'cornie',
      content: '小铃湾在认真听。'
    })

    const defaultRepository = createChatlogRepository(harness.store)
    // 469（方案 B）：聊天记录统一 sql.js 单引擎，默认即 sqljs。
    assert(defaultRepository.driver === CHATLOG_REPOSITORY_DRIVERS.sqljs, '默认 chatlog repository 应为 sql.js')

    const chatlog = createChatlogService(harness.store)
    const dayRecord = chatlog.getByDate('2026-06-30', { limit: 10, cursor: 0 })
    assert(dayRecord.storage.driver === CHATLOG_REPOSITORY_DRIVERS.sqljs, '默认 chatlog service 应通过 sql.js 提供服务')
    assert(dayRecord.messages.length === 2, '默认 chatlog service 应能读出当日消息')

    const searchResult = chatlog.searchMessageSnippets('钟奕菲', { scope: 'all', limit: 10, cursor: 0 })
    assert(searchResult.storage.driver === CHATLOG_REPOSITORY_DRIVERS.sqljs, '消息片段检索也应走 sql.js')
    assert(searchResult.items.length === 1, '消息片段检索应返回命中结果')

    const forcedSqlJs = createChatlogService(harness.store, {
      driver: CHATLOG_REPOSITORY_DRIVERS.sqljs
    })
    const forcedSqlJsDayRecord = forcedSqlJs.getByDate('2026-06-30', { limit: 10, cursor: 0 })
    assert(forcedSqlJsDayRecord.storage.driver === CHATLOG_REPOSITORY_DRIVERS.sqljs, '显式指定 sql.js 时应一致')

    console.log('verify-task396-chatlog-runtime-driver-switch: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
