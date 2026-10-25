import { createServer } from '../../electron/server.js'
import { createLedgerService } from '../../electron/backend/ledger/service.js'
import { getLedgerEntry } from '../../electron/db.js'
import { clearTools } from '../../electron/backend/tools/registry.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

const DATE = '2026-10-22'

async function withServer(harness, conversationOptions, run) {
  const app = await createServer({
    store: harness.store,
    baseDir: harness.baseDir,
    conversationOptions,
  })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  try {
    await run(`http://127.0.0.1:${server.address().port}/api`)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

function createModelStub(entryId) {
  return {
    chatFn: async ({ messages }) => {
      const last = String(messages.at(-1)?.content || '')
      if (last.includes('删除')) {
        return {
          content: JSON.stringify({
            type: 'tool_call',
            assistant_reply: '这笔记录需要主人确认后才能删除。',
            tool_calls: [{ tool_name: 'ledger.delete_entry', arguments: { id: entryId } }],
          }),
        }
      }
      return { content: JSON.stringify({ type: 'reply', assistant_reply: '测试替身已完成。' }) }
    },
    chatStreamFn: async (_request, onDelta) => {
      onDelta('流式')
      onDelta('回复')
      return { content: '流式回复' }
    },
  }
}

function createAbortableModelStub() {
  let streamCount = 0
  return {
    chatFn: async () => ({ content: JSON.stringify({ type: 'reply', assistant_reply: '测试替身已完成。' }) }),
    chatStreamFn: async (_request, onDelta, { signal } = {}) => {
      streamCount += 1
      onDelta(streamCount === 1 ? '第一段' : '重试回复')
      if (streamCount > 1) return { content: '重试回复' }
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('stream aborted')), { once: true })
      })
    },
  }
}

async function testChatHistoryAndConfirmation() {
  const harness = await createServiceHarness('phase1-chat-e2e')
  try {
    const ledger = createLedgerService(harness.store)
    ledger.addExpense({
      id: 'phase1-delete-me',
      amount: 66,
      categoryId: 'exp_food',
      categoryName: '餐饮',
      item: '午饭',
      occurredAt: `${DATE}T12:00:00.000Z`,
    })

    clearTools()
    await withServer(harness, createModelStub('phase1-delete-me'), async (base) => {
      const stream = await fetch(`${base}/conversations/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: DATE, message: '你好' }),
      })
      const streamText = await stream.text()
      assert(streamText.includes('"kind":"delta"'), 'expected SSE delta', streamText)
      assert(streamText.includes('流式回复'), 'expected streamed reply', streamText)

      const history = await fetch(`${base}/chatlogs/${DATE}`).then((res) => res.json())
      assert(history.messages.length === 2, 'expected persisted user and Cornie messages', history)

      const turn = await fetch(`${base}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: DATE, message: '请删除刚才那笔记录' }),
      }).then((res) => res.json())
      assert(turn.pendingConfirmation?.status === 'pending', 'expected pending confirmation', turn)

      const approved = await fetch(`${base}/confirmations/${turn.pendingConfirmation.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      }).then((res) => res.json())
      assert(approved.confirmation.status === 'executed', 'expected approved action executed', approved)
      assert(getLedgerEntry(harness.store, 'phase1-delete-me') === null, 'expected ledger entry deleted')

      const repeated = await fetch(`${base}/confirmations/${turn.pendingConfirmation.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      })
      assert(repeated.status === 409, 'expected repeated decision rejected', repeated.status)
    })
  } finally {
    await harness.close()
  }
}

async function testRetryAfterDisconnectKeepsOneUserMessage() {
  const harness = await createServiceHarness('phase1-chat-retry')
  const requestId = 'retry-after-disconnect'
  try {
    clearTools()
    await withServer(harness, createAbortableModelStub(), async (base) => {
      const controller = new AbortController()
      const first = await fetch(`${base}/conversations/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: DATE, message: '断流后重试', requestId }),
        signal: controller.signal,
      })
      const reader = first.body.getReader()
      await reader.read()
      controller.abort()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const retry = await fetch(`${base}/conversations/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: DATE, message: '断流后重试', requestId }),
      })
      await retry.text()

      const history = await fetch(`${base}/chatlogs/${DATE}`).then((res) => res.json())
      const userMessages = history.messages.filter((message) => message.role === 'user')
      assert(userMessages.length === 1, 'expected retry to keep one user message', history)
    })
  } finally {
    await harness.close()
  }
}

await testChatHistoryAndConfirmation()
await testRetryAfterDisconnectKeepsOneUserMessage()
console.log('tests/services/phase1-chat-e2e.test.mjs: passed 2/2')
