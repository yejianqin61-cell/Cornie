import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createObservationService } from '../electron/backend/observation/service.js'
import { registerObservationTools } from '../electron/backend/observation/tools.js'
import { observationRoutes } from '../electron/backend/observation/routes.js'
import express from 'express'
import { createServer } from 'node:http'

async function callJson(port, path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`)
  const data = await response.json()
  return { response, data }
}

async function run() {
  const harness = await createServiceHarness('task386-observation-recall-protocol')

  try {
    const observation = createObservationService(harness.store)

    observation.addNote({
      date: '2026-06-30',
      type: 'event',
      title: '提到龙虾',
      content: '今天又聊到了龙虾这件事。',
      relatedRef: 'topic:龙虾',
      sourceText: '龙虾被反复提起'
    })
    observation.addNote({
      date: '2026-06-30',
      type: 'emotion',
      title: '提到钟奕菲',
      content: '主人说钟奕菲对他很重要。',
      relatedRef: 'person:钟奕菲',
      sourceText: '钟奕菲是重要人物'
    })

    const topicResults = observation.listByRecall({ topic: '龙虾', limit: 20 })
    assert(topicResults.length === 1, '按 topic 应能命中对应观察日志')
    assert(topicResults[0].title === '提到龙虾', 'topic recall 应返回正确观察日志')

    const personResults = observation.listByRecall({ person: '钟奕菲', limit: 20 })
    assert(personResults.length === 1, '按 person 应能命中对应观察日志')
    assert(personResults[0].title === '提到钟奕菲', 'person recall 应返回正确观察日志')

    const relatedRefResults = observation.listByRecall({ q: 'topic:龙虾', limit: 20 })
    assert(relatedRefResults.length === 1, 'relatedRef 应参与 recall 命中')

    const tools = new Map()
    registerObservationTools(harness.store, {
      registerTool(definition) {
        tools.set(definition.name, definition)
      }
    })
    assert(tools.has('observation.recall_history'), '工具集应注册 observation.recall_history')

    const toolResult = await tools.get('observation.recall_history').handler({ topic: '龙虾', limit: 20 })
    assert(toolResult.ok === true, 'recall tool 应返回 ok')
    assert(toolResult.result.length === 1, 'recall tool 应返回命中观察日志')

    const app = express()
    app.use(observationRoutes({ store: harness.store }))
    const server = createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = server.address().port

    try {
      const { response, data } = await callJson(port, '/observations/recall?person=%E9%92%9F%E5%A5%95%E8%8F%B2&limit=20')
      assert(response.status === 200, 'recall route 应返回 200')
      assert(Array.isArray(data.observations) && data.observations.length === 1, 'recall route 应返回命中的观察日志')
      assert(data.recall.person === '钟奕菲', 'recall route 应回显 person 参数')
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }

    console.log('verify-task386-observation-recall-protocol: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
