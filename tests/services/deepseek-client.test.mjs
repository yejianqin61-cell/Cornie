// BE-09：模型层统一测试（mock fetch，不真实联网）。
// config 从环境变量读取，须在动态 import 前设置。

process.env.DEEPSEEK_API_KEY = 'test-key'
process.env.DEEPSEEK_BASE_URL = 'http://mock.deepseek'
process.env.DEEPSEEK_TIMEOUT_MS = '5000'

const { assert } = await import('../shared/service-harness.mjs')
const { chatStream, chat } = await import('../../electron/backend/model/deepseek/client.js')

const originalFetch = globalThis.fetch

function sseResponse(lines) {
  const encoder = new TextEncoder()
  let index = 0
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          read: async () => {
            if (index >= lines.length) return { done: true }
            const line = lines[index]
            index += 1
            return { done: false, value: encoder.encode(line) }
          }
        }
      }
    }
  }
}

async function testEOFWithoutDoneIsIncomplete() {
  globalThis.fetch = async () =>
    sseResponse([
      'data: {"choices":[{"delta":{"content":"你"}}]}\n',
      'data: {"choices":[{"delta":{"content":"好"}}]}\n'
    ])
  let collected = ''
  const result = await chatStream({ messages: [] }, (delta) => {
    collected += delta
  })
  assert(collected === '你好', 'expected deltas collected', collected)
  assert(result.finishReason === 'incomplete', 'expected incomplete on EOF without [DONE]', result)
  assert(result.content === '你好', 'expected content preserved', result)
}

async function testDoneIsStop() {
  globalThis.fetch = async () =>
    sseResponse(['data: {"choices":[{"delta":{"content":"好"}}]}\n', 'data: [DONE]\n'])
  const result = await chatStream({ messages: [] }, () => {})
  assert(result.finishReason === 'stop', 'expected stop with [DONE]', result)
}

async function testBadLineSkipped() {
  globalThis.fetch = async () =>
    sseResponse([
      ': keep-alive\n',
      'data: {"choices":[{"delta":{"content":"好"}}]}\n',
      'data: not-json\n',
      'data: [DONE]\n'
    ])
  let collected = ''
  const result = await chatStream({ messages: [] }, (delta) => {
    collected += delta
  })
  assert(collected === '好', 'expected bad lines skipped, delta intact', collected)
  assert(result.finishReason === 'stop', 'expected stop', result)
}

async function testRetryOnNetworkError() {
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    if (calls === 1) throw new TypeError('fetch failed')
    return sseResponse(['data: [DONE]\n'])
  }
  const result = await chatStream({ messages: [] }, () => {})
  assert(calls === 2, 'expected retry after network failure', calls)
  assert(result.finishReason === 'stop', 'expected success after retry', result)
}

async function testExternalAbortCode() {
  const controller = new AbortController()
  globalThis.fetch = async (_url, init) =>
    new Promise((_, reject) => {
      init.signal.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted.', 'AbortError'))
      )
    })
  setTimeout(() => controller.abort(), 10)
  let threw = null
  try {
    await chatStream({ messages: [] }, () => {}, { signal: controller.signal })
  } catch (error) {
    threw = error
  }
  assert(threw !== null, 'expected throw on abort', threw)
  assert(threw.code === 'aborted', 'expected aborted code for external cancel', threw)
}

async function testChatNonStreamStillWorks() {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: '非流式回复' }, finish_reason: 'stop' }],
      usage: { total_tokens: 10 }
    })
  })
  const result = await chat({ messages: [{ role: 'user', content: 'hi' }] })
  assert(result.content === '非流式回复', 'expected chat content', result)
  assert(result.finishReason === 'stop', 'expected chat finish reason', result)
}

try {
  await testEOFWithoutDoneIsIncomplete()
  console.log('PASS model - EOF without [DONE] -> incomplete')
  await testDoneIsStop()
  console.log('PASS model - [DONE] -> stop')
  await testBadLineSkipped()
  console.log('PASS model - bad SSE lines skipped')
  await testRetryOnNetworkError()
  console.log('PASS model - retry on network error')
  await testExternalAbortCode()
  console.log('PASS model - external abort -> aborted code')
  await testChatNonStreamStillWorks()
  console.log('PASS model - non-stream chat works')
  console.log('tests/services/deepseek-client.test.mjs: passed 6/6')
} finally {
  globalThis.fetch = originalFetch
}
