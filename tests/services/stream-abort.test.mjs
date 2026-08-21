// BE-04：SSE 断连中止测试。
// 用 mock conversation 服务验证：客户端断开 → req close → 服务端 AbortController 触发。

import express from 'express'

import { assert } from '../shared/service-harness.mjs'
import { conversationRoutes } from '../../electron/backend/conversation/routes.js'
import { jsonErrorHandler } from '../../electron/backend/http/middleware.js'

async function withApi(conversation, fn) {
  const app = express()
  app.use(express.json())
  app.use('/api', conversationRoutes({ conversation }))
  app.use(jsonErrorHandler)
  const server = app.listen(0, '127.0.0.1')
  const sockets = new Set()
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })
  await new Promise((resolve) => server.once('listening', resolve))
  const port = server.address().port
  try {
    await fn(`http://127.0.0.1:${port}/api`)
  } finally {
    for (const socket of sockets) {
      socket.destroy()
    }
    await new Promise((resolve) => server.close(resolve))
  }
}

async function testClientDisconnectAbortsServerStream() {
  const aborted = { value: false }
  let deltasSent = 0
  const mockConversation = {
    sendMessage: async () => ({ cornieMessage: { content: 'x' } }),
    getConversation: () => [],
    deleteConversation: () => {},
    sendMessageStreamed: async ({ date, message }, onDelta, { signal } = {}) => {
      signal?.addEventListener('abort', () => {
        aborted.value = true
      })
      onDelta('第一段')
      deltasSent += 1
      // 挂起等待：客户端断开（signal abort）或正常完成
      await new Promise((resolve) => {
        signal?.addEventListener('abort', resolve, { once: true })
      })
      return { cornieMessage: { content: '回复' } }
    }
  }

  await withApi(mockConversation, async (base) => {
    const controller = new AbortController()
    const res = await fetch(`${base}/conversations/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '你好', date: '2026-08-21' }),
      signal: controller.signal
    })
    assert(res.status === 200, 'expected 200', res.status)

    // 读第一块（delta 事件）
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    await reader.read()
    void decoder // decoder 用于后续（此处仅确认连接建立并有数据）

    // 客户端断开 → 服务端应触发 abort
    controller.abort()
    // 等待 abort 传播
    await new Promise((resolve) => setTimeout(resolve, 100))

    assert(aborted.value === true, 'expected server-side abort on client disconnect')
    assert(deltasSent >= 1, 'expected delta delivered before disconnect', deltasSent)
    try {
      await reader.cancel()
    } catch {
      // 连接已关闭
    }
  })
}

async function testStreamErrorEvent() {
  const mockConversation = {
    sendMessage: async () => ({ cornieMessage: { content: 'x' } }),
    getConversation: () => [],
    deleteConversation: () => {},
    sendMessageStreamed: async () => {
      throw new Error('模型不可用')
    }
  }

  await withApi(mockConversation, async (base) => {
    const res = await fetch(`${base}/conversations/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '你好', date: '2026-08-21' })
    })
    const text = await res.text()
    assert(text.includes('"kind":"error"'), 'expected error event in SSE', text.slice(0, 200))
  })
}

const tests = [
  ['client disconnect aborts server stream', testClientDisconnectAbortsServerStream],
  ['stream failure emits error event', testStreamErrorEvent]
]

let passed = 0

for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS services - ${name}`)
}

console.log(`tests/services/stream-abort.test.mjs: passed ${passed}/${tests.length}`)
