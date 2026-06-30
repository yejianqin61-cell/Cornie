import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { saveMessage } from '../electron/db.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'
import { chatlogRoutes } from '../electron/backend/chatlog/routes.js'

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    json(payload) {
      this.body = payload
      return this
    },
    status(code) {
      this.statusCode = code
      return this
    }
  }
}

async function invokeRoute(router, method, url, { query = {}, params = {} } = {}) {
  const layer = router.stack.find((item) => item.route?.path === url && item.route.methods?.[method.toLowerCase()])
  if (!layer) {
    throw new Error(`route not found: ${method} ${url}`)
  }
  const req = {
    method,
    query,
    params
  }
  const res = createMockResponse()
  await layer.route.stack[0].handle(req, res, (error) => {
    if (error) throw error
  })
  return res.body
}

async function run() {
  const harness = await createServiceHarness('task397-chatlog-history-contracts')
  const dateA = '2026-06-29'
  const dateB = '2026-06-30'

  try {
    saveMessage(harness.store, {
      id: 'a-1',
      date: dateA,
      role: 'user',
      content: '昨天聊了龙虾。'
    })
    saveMessage(harness.store, {
      id: 'b-1',
      date: dateB,
      role: 'user',
      content: '今天继续聊龙虾和考试。'
    })
    saveMessage(harness.store, {
      id: 'b-2',
      date: dateB,
      role: 'cornie',
      content: '小铃湾记住啦。'
    })

    const chatlog = createChatlogService(harness.store)
    const router = chatlogRoutes({ chatlog })

    const historyList = await invokeRoute(router, 'GET', '/chatlogs', {
      query: {
        q: '龙虾',
        scope: 'all',
        limit: '10',
        cursor: '0'
      }
    })
    assert(historyList.meta?.responseType === 'chatlog_history_list', '历史列表响应应带 responseType')
    assert(Array.isArray(historyList.entries) && historyList.entries.length === 2, '历史列表应返回跨日期命中')

    const snippetResult = await invokeRoute(router, 'GET', '/chatlogs/search/snippets', {
      query: {
        keyword: '龙虾',
        scope: 'all',
        limit: '10',
        cursor: '0'
      }
    })
    assert(snippetResult.meta?.responseType === 'chatlog_message_snippet_search', '消息片段检索应带 responseType')
    assert(Array.isArray(snippetResult.items) && snippetResult.items.length === 2, '消息片段检索应返回跨日期命中消息')

    const emptySnippetResult = chatlog.searchMessageSnippets('', { scope: 'all', limit: 10, cursor: 0 })
    assert(emptySnippetResult.pagination.total === 0, '空关键词片段检索应返回空分页')

    const dayExport = await invokeRoute(router, 'GET', '/chatlogs/:date/export', {
      params: { date: dateB },
      query: { format: 'json' }
    })
    assert(dayExport.meta?.responseType === 'chatlog_day_export', '单日导出应带 responseType')

    const monthExport = await invokeRoute(router, 'GET', '/chatlogs/export/month/:month', {
      params: { month: '2026-06' },
      query: { format: 'json' }
    })
    assert(monthExport.meta?.responseType === 'chatlog_month_export', '按月导出应带 responseType')

    console.log('verify-task397-chatlog-history-contracts: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
