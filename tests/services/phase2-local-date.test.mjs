import express from 'express'

import { conversationRoutes } from '../../electron/backend/conversation/routes.js'
import { jsonErrorHandler } from '../../electron/backend/http/middleware.js'
import { singaporeDate } from '../../shared/local-date.js'
import { assert } from '../shared/service-harness.mjs'

function testSingaporeDate() {
  assert(
    singaporeDate(new Date('2026-10-21T16:30:00.000Z')) === '2026-10-22',
    'expected Singapore 00:30 to remain on the 22nd'
  )
  assert(
    singaporeDate(new Date('2026-10-21T15:30:00.000Z')) === '2026-10-21',
    'expected Singapore 23:30 to remain on the 21st'
  )
}

async function testConversationDefaultDate() {
  const sent = []
  const app = express()
  app.use(express.json())
  app.use(
    '/api',
    conversationRoutes({
      conversation: {
        sendMessage: async (input) => {
          sent.push(input)
          return { ok: true }
        },
      },
      now: () => new Date('2026-10-21T16:30:00.000Z'),
    })
  )
  app.use(jsonErrorHandler)

  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    await fetch(`${base}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '默认日期' }),
    })
    assert(sent[0]?.date === '2026-10-22', 'expected conversation to use Singapore date', sent)

    await fetch(`${base}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '显式日期', date: '2026-10-20' }),
    })
    assert(sent[1]?.date === '2026-10-20', 'expected explicit ISO date to stay unchanged', sent)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

testSingaporeDate()
await testConversationDefaultDate()
console.log('tests/services/phase2-local-date.test.mjs: passed 2/2')
