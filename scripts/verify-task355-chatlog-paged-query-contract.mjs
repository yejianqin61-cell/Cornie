import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { saveMessage } from '../electron/db.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'

async function run() {
  const harness = await createServiceHarness('task355-chatlog-paged-query-contract')
  const chatlog = createChatlogService(harness.store)
  const date = '2026-06-30'

  for (let index = 0; index < 6; index += 1) {
    saveMessage(harness.store, {
      id: `u-${index}`,
      date,
      role: index % 2 === 0 ? 'user' : 'cornie',
      content: index === 3 ? `今天我们聊到了龙虾和考试 ${index}` : `普通消息 ${index}`
    })
  }

  const page1 = chatlog.getByDate(date, { limit: 2, cursor: 0 })
  assert(page1.messages.length === 2, '单日分页应按 limit 返回消息')
  assert(page1.pagination.hasMore === true, '分页第一页应有更多消息')
  assert(page1.pagination.nextCursor === '2', 'nextCursor 应正确前进')

  const page2 = chatlog.getByDate(date, { limit: 2, cursor: page1.pagination.nextCursor })
  assert(page2.messages.length === 2, '第二页也应正常返回消息')

  const queryResult = chatlog.getByDate(date, { limit: 10, cursor: 0, query: '龙虾' })
  assert(queryResult.messages.length === 1, '按关键词筛选单日消息应返回命中消息')
  assert(queryResult.messages[0].matchedPreview.includes('龙虾'), '命中消息应返回 matchedPreview')
  assert(queryResult.searchMeta.query === '龙虾', '单日查询 searchMeta 应保留 query')

  const dateSearch = chatlog.listDates({ query: '龙虾', limit: 10, cursor: 0 })
  assert(dateSearch.entries.length === 1, '日期搜索应命中对应聊天日期')
  assert(dateSearch.entries[0].matchedCount === 1, '日期搜索应返回 matchedCount')
  assert(dateSearch.entries[0].matchedPreview.includes('龙虾'), '日期搜索应返回 matchedPreview')

  await harness.close()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
