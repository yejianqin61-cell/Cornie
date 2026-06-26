import express from 'express'
import { diaryRoutes } from './backend/diary/routes.js'
import { diaryService } from './backend/diary/service.js'
import { chatlogRoutes } from './backend/chatlog/routes.js'
import { conversationRoutes } from './backend/conversation/routes.js'
import { conversationService } from './backend/conversation/service.js'
import { createChatlogService } from './backend/chatlog/service.js'
import { createConfirmService } from './backend/confirm/service.js'
import { confirmRoutes } from './backend/confirm/routes.js'
import { checkHealth as checkModelHealth } from './backend/model/deepseek/client.js'
import { jsonErrorHandler } from './backend/http/middleware.js'
import { registerTool } from './backend/tools/registry.js'
import { registerLedgerTools } from './backend/ledger/tools.js'
import { registerTodoTools } from './backend/todo/tools.js'
import { registerScheduleTools } from './backend/schedule/tools.js'
import { registerObservationTools } from './backend/observation/tools.js'
import { registerMemoryTools } from './backend/memory/tools.js'

export function createServer({ store }) {
  const app = express()
  app.use(express.json({ limit: '1mb' }))

  // 开发期：渲染进程(vite:5173) -> 本地 API(5174) 需要 CORS
  // 打包后建议改为走 preload/IPC 或同源 scheme，届时可移除此段
  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin === 'http://127.0.0.1:5173') {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.setHeader('Access-Control-Max-Age', '86400')
    }
    if (req.method === 'OPTIONS') return res.status(204).end()
    next()
  })

  app.get('/api/health', (_req, res) =>
    res.json({
      ok: true,
      version: 1
    })
  )

  const diary = diaryService(store)
  app.use('/api', diaryRoutes({ diary }))

  const chatlog = createChatlogService(store)
  app.use('/api', chatlogRoutes({ chatlog }))

  registerLedgerTools(store, { registerTool })
  registerTodoTools(store, { registerTool })
  registerScheduleTools(store, { registerTool })
  registerObservationTools(store, { registerTool })
  registerMemoryTools(store, { registerTool })

  const confirm = createConfirmService(store)
  app.use('/api', confirmRoutes({ confirm }))

  const conversation = conversationService(store)
  app.use('/api', conversationRoutes({ conversation }))

  app.get('/api/model/status', async (_req, res) => {
    const status = await checkModelHealth()
    res.json(status)
  })

  app.use(jsonErrorHandler)

  return app
}

