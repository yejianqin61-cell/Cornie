import express from 'express'

import { saveMessage } from '../../electron/db.js'
import { createChatlogService } from '../../electron/backend/chatlog/service.js'
import { chatlogRoutes } from '../../electron/backend/chatlog/routes.js'
import { createConfirmService } from '../../electron/backend/confirm/service.js'
import { confirmRoutes } from '../../electron/backend/confirm/routes.js'
import { jsonErrorHandler } from '../../electron/backend/http/middleware.js'
import { listChatDays, getChatDay } from '../../src/renderer/api/chatlog.js'
import { confirmAction } from '../../src/renderer/api/confirm.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

const API_BASE = 'http://127.0.0.1:5174'
const DATE = '2026-10-22'

async function withApi(store, fn) {
  const app = express()
  const chatlog = createChatlogService(store)
  const confirm = createConfirmService(store)
  app.use(express.json())
  app.use('/api', chatlogRoutes({ chatlog }))
  app.use('/api', confirmRoutes({ confirm }))
  app.use((_req, res) => res.status(404).json({ error: 'route not found' }))
  app.use(jsonErrorHandler)

  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const realFetch = globalThis.fetch
  globalThis.fetch = (url, options) => realFetch(String(url).replace(API_BASE, base), options)

  try {
    await fn({ confirm })
  } finally {
    globalThis.fetch = realFetch
    await new Promise((resolve) => server.close(resolve))
  }
}

function createPendingConfirmation(confirm) {
  return confirm.createPending({
    date: DATE,
    conversationMessageId: 'message-confirmation',
    sourceText: '这次先不要执行',
    assistantReply: '需要主人确认。',
    toolCalls: [{ tool_name: 'system.get_runtime_info', arguments: {} }],
    confirmRequest: {
      kind: 'tool_confirmation',
      toolName: 'system.get_runtime_info',
      reason: '测试确认决定契约'
    }
  })
}

async function testChatHistoryContract() {
  const harness = await createServiceHarness('phase1-chat-contract')
  try {
    saveMessage(harness.store, {
      id: 'phase1-user',
      date: DATE,
      role: 'user',
      content: '你好'
    })
    saveMessage(harness.store, {
      id: 'phase1-cornie',
      date: DATE,
      role: 'cornie',
      content: '你好呀。'
    })

    await withApi(harness.store, async () => {
      const days = await listChatDays()
      assert(days.entries.some((entry) => entry.date === DATE), 'expected chat date entry', days)

      const day = await getChatDay(DATE)
      assert(day.messages[1].text === '你好呀。', 'expected message content mapped to text', day)
      assert(day.messages[1].role === 'assistant', 'expected cornie mapped to assistant', day)
      assert(day.pagination?.total === 2, 'expected backend pagination preserved', day)
    })
  } finally {
    await harness.close()
  }
}

async function testConfirmationDecisionContract() {
  const harness = await createServiceHarness('phase1-confirm-contract')
  try {
    await withApi(harness.store, async ({ confirm }) => {
      const pending = createPendingConfirmation(confirm)
      const result = await confirmAction(pending.id, 'reject')
      assert(result.confirmation.status === 'rejected', 'expected rejection through real endpoint', result)

      let repeatError = null
      try {
        await confirmAction(pending.id, 'reject')
      } catch (error) {
        repeatError = error
      }
      assert(repeatError?.message.includes('already rejected'), 'expected repeat decision rejected', repeatError)
    })
  } finally {
    await harness.close()
  }
}

const tests = [
  ['chat history API contract', testChatHistoryContract],
  ['confirmation decision API contract', testConfirmationDecisionContract]
]

let passed = 0
for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS phase1 contract - ${name}`)
}

console.log(`tests/services/phase1-chat-contract.test.mjs: passed ${passed}/${tests.length}`)
