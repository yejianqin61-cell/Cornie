import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { saveMessage } from '../electron/db.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'
import { registerSystemTools } from '../electron/backend/system/tools.js'

async function run() {
  const harness = await createServiceHarness('task392-chat-message-snippet-search-tool')

  try {
    saveMessage(harness.store, {
      id: 'msg-1',
      date: '2026-06-28',
      role: 'user',
      content: '今天又提到了龙虾，我真的很喜欢龙虾。'
    })
    saveMessage(harness.store, {
      id: 'msg-2',
      date: '2026-06-29',
      role: 'user',
      content: '昨天的龙虾很好吃，我还想再吃一次龙虾。'
    })
    saveMessage(harness.store, {
      id: 'msg-3',
      date: '2026-06-30',
      role: 'cornie',
      content: '小铃湾记得主人今天说想去吃面。'
    })

    const chatlog = createChatlogService(harness.store)
    const result = chatlog.searchMessageSnippets('龙虾', { scope: 'all', limit: 10, cursor: 0 })
    assert(result.items.length === 2, '应跨日期返回两条龙虾命中消息')
    assert(result.items.some((item) => item.date === '2026-06-28' && item.messageId === 'msg-1'), '命中结果应包含 2026-06-28 的对应消息')
    assert(result.items.some((item) => item.date === '2026-06-29' && item.messageId === 'msg-2'), '命中结果应包含 2026-06-29 的对应消息')
    assert(result.items.every((item) => item.matchedPreview && item.matchedPreview.includes('龙虾')), '每条命中应带 matchedPreview')

    const paged = chatlog.searchMessageSnippets('龙虾', { scope: 'all', limit: 1, cursor: 1 })
    assert(paged.items.length === 1, '分页查询应只返回一条消息')
    assert(paged.pagination.total === 2, '分页结果应返回总条数')

    const tools = new Map()
    registerSystemTools(harness.store, {
      registerTool(definition) {
        tools.set(definition.name, definition)
      }
    })
    assert(tools.has('conversation.search_message_snippets'), '系统工具应注册 conversation.search_message_snippets')

    const toolResult = await tools.get('conversation.search_message_snippets').handler({
      keyword: '龙虾',
      scope: 'all',
      limit: 10,
      cursor: 0
    })
    assert(toolResult.ok === true, '消息片段检索工具应返回 ok')
    assert(toolResult.result.items.length === 2, '消息片段检索工具应返回跨日期命中结果')

    console.log('verify-task392-chat-message-snippet-search-tool: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
