import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createConversationOrchestrator } from '../electron/backend/agent/orchestrator.js'
import { chatStream } from '../electron/backend/model/deepseek/client.js'
import { saveMessage } from '../electron/db.js'

function buildSseBody(chunks) {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    }
  })
}

async function run() {
  const harness = await createServiceHarness('task454-streaming-speech')

  try {
    // 1) chatStream SSE 解析
    const previousApiKey = process.env.DEEPSEEK_API_KEY
    process.env.DEEPSEEK_API_KEY = 'verify-454-key'
    const originalFetch = global.fetch

    global.fetch = async () => ({
      ok: true,
      status: 200,
      body: buildSseBody([
        'data: {"choices":[{"delta":{"content":"今"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"天"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"很"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"好"}}]}\n\n',
        'data: [DONE]\n\n'
      ]),
      async text() {
        return ''
      }
    })

    try {
      const deltas = []
      const result = await chatStream(
        { messages: [{ role: 'user', content: 'hi' }], temperature: 0.5, maxTokens: 50 },
        (delta) => deltas.push(delta)
      )
      assert(result.content === '今天很好', 'chatStream 应累加 delta', result.content)
      assert(deltas.join('') === '今天很好', 'onDelta 应逐块回调', deltas)
    } finally {
      global.fetch = originalFetch
    }

    // 2) orchestrator 说话段：流式重说 + 消息落库
    saveMessage(harness.store, {
      id: 'msg-454-user',
      date: '2026-08-21',
      role: 'user',
      content: '今天怎么样呀'
    })

    global.fetch = async (_url, options = {}) => {
      const payload = JSON.parse(String(options?.body ?? '{}'))
      if (payload?.stream === true) {
        return {
          ok: true,
          status: 200,
          body: buildSseBody([
            'data: {"choices":[{"delta":{"content":"好"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":"呀"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":"！"}}]}\n\n',
            'data: [DONE]\n\n'
          ]),
          async text() {
            return ''
          }
        }
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return { choices: [{ message: { content: JSON.stringify({ type: 'reply', assistant_reply: '很好呀！' }) } }] }
        },
        async text() {
          return ''
        }
      }
    }

    try {
      const orchestrator = createConversationOrchestrator(harness.store, { baseDir: harness.baseDir })
      const deltas = []
      const result = await orchestrator.runTurn({
        date: '2026-08-21',
        message: '今天怎么样呀',
        streamFinalReply: true,
        onFinalDelta: (delta) => deltas.push(delta)
      })
      assert(deltas.join('') === '好呀！', '说话段应逐块流式下发', deltas)
      assert(String(result.cornieMessage?.content ?? '') === '好呀！', '落库内容应为流式重说结果', result.cornieMessage?.content)
    } finally {
      global.fetch = originalFetch
      if (previousApiKey === undefined) {
        delete process.env.DEEPSEEK_API_KEY
      } else {
        process.env.DEEPSEEK_API_KEY = previousApiKey
      }
    }

    console.log('verify-task454-streaming-speech: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
