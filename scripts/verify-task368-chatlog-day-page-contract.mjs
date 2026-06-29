import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { saveMessage } from '../electron/db.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'

async function run() {
  const harness = await createServiceHarness('task368-chatlog-day-page-contract')
  const chatlog = createChatlogService(harness.store)
  const date = '2026-06-30'

  for (let index = 0; index < 8; index += 1) {
    saveMessage(harness.store, {
      id: `msg-${index}`,
      date,
      role: index % 2 === 0 ? 'user' : 'cornie',
      content: index === 5 ? `今天聊到了龙虾和钟奕菲 ${index}` : `普通消息 ${index}`
    })
  }

  const page1 = chatlog.getDayPage(date, { limit: 3, cursor: 0 })
  assert(page1.items.length === 3, '单日分页结构应按 limit 返回 items')
  assert(page1.hasMore === true, '首屏分页应返回 hasMore=true')
  assert(page1.nextCursor === '3', '首屏分页应返回 nextCursor')
  assert(page1.context.total === 8, '上下文应返回该日总消息数')
  assert(page1.context.currentCursor === '0', '上下文应返回当前游标')
  assert(page1.context.firstItemId === 'msg-0', '上下文应返回首条消息 id')
  assert(page1.context.lastItemId === 'msg-2', '上下文应返回末条消息 id')

  const page2 = chatlog.getDayPage(date, { limit: 3, cursor: Number(page1.nextCursor) })
  assert(page2.items.length === 3, '后续分页应继续返回 items')
  assert(page2.context.currentCursor === '3', '后续分页应更新 currentCursor')
  assert(page2.context.firstItemId === 'msg-3', '后续分页首条 id 应正确')

  const beforePage = chatlog.getDayPage(date, { limit: 2, beforeId: 'msg-5' })
  assert(beforePage.context.beforeId === 'msg-5', 'beforeId 分页应回显 beforeId')
  assert(beforePage.context.currentCursor === '5', 'beforeId 分页应转换到对应 offset')
  assert(beforePage.items[0].id === 'msg-5', 'beforeId 分页应从指定消息开始返回')

  const queryPage = chatlog.getDayPage(date, { limit: 10, query: '龙虾' })
  assert(queryPage.items.length === 1, '查询分页应只返回命中消息')
  assert(queryPage.items[0].matchedPreview.includes('龙虾'), '查询分页结果应带 matchedPreview')
  assert(queryPage.searchMeta.mode === 'keyword', '查询分页应返回 keyword 模式')

  const legacy = chatlog.getByDate(date, { limit: 2, cursor: 0 })
  assert(Array.isArray(legacy.messages), '兼容接口仍应返回 messages')
  assert(legacy.pagination.nextCursor === '2', '兼容接口分页不能被破坏')

  await harness.close()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
