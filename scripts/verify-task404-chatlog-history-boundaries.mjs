import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { saveMessage } from '../electron/db.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'
import { buildConversationContext, CONVERSATION_CONTEXT_BUDGETS } from '../electron/backend/agent/contextBuilder.js'

async function run() {
  const harness = await createServiceHarness('task404-chatlog-history-boundaries')
  const store = harness.store
  const baseDir = harness.baseDir
  const chatlog = createChatlogService(store, {
    dbPath: store.dbPath
  })

  try {
    const longDay = '2026-06-30'
    const previousDay = '2026-06-29'

    for (let index = 0; index < 120; index += 1) {
      saveMessage(store, {
        id: `long-${index}`,
        date: longDay,
        role: index % 2 === 0 ? 'user' : 'cornie',
        content:
          index === 73
            ? `第${index}条长会话消息，里面提到了龙虾和钟奕菲。`
            : `第${index}条长会话普通消息。`
      })
    }

    for (let index = 0; index < 12; index += 1) {
      saveMessage(store, {
        id: `prev-${index}`,
        date: previousDay,
        role: index % 2 === 0 ? 'user' : 'cornie',
        content:
          index === 4
            ? `前一天第${index}条消息，也提到了龙虾。`
            : `前一天第${index}条普通消息。`
      })
    }

    const page1 = chatlog.getDayPage(longDay, { limit: 25, cursor: 0 })
    assert(page1.items.length === 25, '长会话首屏分页应按 limit 返回')
    assert(page1.context.total === 120, '长会话分页应返回该日总消息数')
    assert(page1.hasMore === true, '长会话首屏应存在更多消息')
    assert(page1.nextCursor === '25', '长会话首屏 nextCursor 应正确')

    const page2 = chatlog.getDayPage(longDay, { limit: 25, cursor: Number(page1.nextCursor) })
    assert(page2.items[0].id === 'long-25', '长会话第二页应从正确位置继续')
    assert(page2.context.currentCursor === '25', '长会话第二页应正确回显 currentCursor')

    const beforePage = chatlog.getDayPage(longDay, { limit: 5, beforeId: 'long-73' })
    assert(beforePage.items[0].id === 'long-73', 'beforeId 跳读应从目标消息开始')
    assert(beforePage.context.beforeId === 'long-73', 'beforeId 跳读应回显 beforeId')
    assert(beforePage.context.currentCursor === '73', 'beforeId 跳读应转换为对应游标')

    const snippets = chatlog.searchMessageSnippets('龙虾', {
      scope: 'all',
      limit: 10,
      cursor: 0
    })
    assert(snippets.items.length === 2, '跨日片段检索应命中两天的消息片段')
    assert(snippets.items.some((item) => item.date === longDay), '片段检索应包含长会话当天')
    assert(snippets.items.some((item) => item.date === previousDay), '片段检索应包含前一天')
    assert(snippets.items.every((item) => item.matchedPreview.includes('龙虾')), '片段检索结果应带 matchedPreview')

    const listResult = chatlog.listDates({ query: '龙虾', limit: 10, cursor: 0, scope: 'all' })
    assert(listResult.entries.length === 2, '按日期检索应返回命中两天')
    assert(listResult.entries.every((item) => item.matchedCount >= 1), '按日期检索应返回 matchedCount')

    const context = await buildConversationContext(store, {
      date: longDay,
      baseDir
    })
    const recentLines = context.recentConversationSummary.split('\n').filter(Boolean)
    assert(
      recentLines.length === CONVERSATION_CONTEXT_BUDGETS.recentConversationMessages,
      '主链上下文只应注入固定条数的最近对话摘要'
    )
    assert(
      !context.recentConversationSummary.includes('第0条长会话普通消息'),
      '主链上下文不应把超长会话早期消息默认整包注入'
    )
    assert(
      context.loadPolicy.recallOnlyLayers.includes('chat_recall_summary'),
      '主链策略应明确历史聊天属于 recallOnly 层'
    )

    console.log('verify-task404-chatlog-history-boundaries: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
