import express from 'express'
import { diaryRoutes } from './backend/diary/routes.js'
import { diaryService } from './backend/diary/service.js'
import { chatlogRoutes } from './backend/chatlog/routes.js'
import { conversationRoutes } from './backend/conversation/routes.js'
import { conversationService } from './backend/conversation/service.js'
import { createChatlogService } from './backend/chatlog/service.js'
import { CHATLOG_REPOSITORY_DRIVERS } from './backend/chatlog/repository.js'
import { createConfirmService } from './backend/confirm/service.js'
import { confirmRoutes } from './backend/confirm/routes.js'
import { checkHealth as checkModelHealth } from './backend/model/deepseek/client.js'
import { jsonErrorHandler } from './backend/http/middleware.js'
import { registerTool } from './backend/tools/registry.js'
import { registerLedgerTools } from './backend/ledger/tools.js'
import { createLedgerService } from './backend/ledger/service.js'
import { ledgerRoutes } from './backend/ledger/routes.js'
import { registerTodoTools } from './backend/todo/tools.js'
import { createTodoService } from './backend/todo/service.js'
import { todoRoutes } from './backend/todo/routes.js'
import { registerScheduleTools } from './backend/schedule/tools.js'
import { createScheduleService } from './backend/schedule/service.js'
import { scheduleRoutes } from './backend/schedule/routes.js'
import { observationRoutes } from './backend/observation/routes.js'
import { registerObservationTools } from './backend/observation/tools.js'
import { registerSystemTools } from './backend/system/tools.js'
import { createMemoryWikiService, createTopicIndexStore } from './backend/memory-wiki/index.js'
import { registerMemoryWikiTools } from './backend/memory-wiki/tools.js'
import { memoryWikiRoutes } from './backend/memory-wiki/routes.js'
import { applyPersistedModelSettingsToEnv, createSettingsService } from './backend/settings/service.js'
import { settingsRoutes } from './backend/settings/routes.js'

export function createServer({ store, baseDir = process.cwd() }) {
  const app = express()
  app.use(express.json({ limit: '1mb' }))
  applyPersistedModelSettingsToEnv(store)

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

  const chatlog = createChatlogService(store, {
    driver: CHATLOG_REPOSITORY_DRIVERS.sqljs
  })
  app.use('/api', chatlogRoutes({ chatlog }))

  const ledger = createLedgerService(store)
  app.use('/api', ledgerRoutes({ ledger }))

  const todo = createTodoService(store)
  app.use('/api', todoRoutes({ todo }))

  const schedule = createScheduleService(store)
  app.use('/api', scheduleRoutes({ schedule }))

  const settings = createSettingsService(store)
  app.use('/api', settingsRoutes({ settings }))

  app.use('/api', observationRoutes({ store }))

  let memoryWikiReady = null
  async function getMemoryWikiDeps() {
    if (!memoryWikiReady) {
      memoryWikiReady = (async () => {
        const memoryWiki = await createMemoryWikiService({ baseDir, store })
        const topicIndex = await createTopicIndexStore(baseDir)
        return { memoryWiki, topicIndex }
      })()
    }
    return memoryWikiReady
  }

  const memoryWikiApi = express.Router()
  memoryWikiApi.use(async (req, res, next) => {
    try {
      const deps = await getMemoryWikiDeps()
      memoryWikiRoutes(deps)(req, res, next)
    } catch (error) {
      next(error)
    }
  })
  app.use('/api', memoryWikiApi)

  registerLedgerTools(store, { registerTool })
  registerTodoTools(store, { registerTool })
  registerScheduleTools(store, { registerTool })
  registerObservationTools(store, { registerTool })
  registerSystemTools(store, { registerTool })

  // 记忆工具接线（450 / D-01）：注册 memory_wiki.* / memory_index.* / memory_governance.* 工具，
  // 使"模型工具集 = 人类接口集"运行时生效；baseDir 与提炼轮次等共用 main.js 启动链传入的同一来源。
  registerMemoryWikiTools({ baseDir, store }, { registerTool }).catch((error) => {
    console.error('Memory wiki tools registration failed:', error)
  })

  const confirm = createConfirmService(store)
  app.use('/api', confirmRoutes({ confirm }))

  const conversation = conversationService(store, { baseDir })
  app.use('/api', conversationRoutes({ conversation }))

  app.get('/api/model/status', async (_req, res) => {
    const status = await checkModelHealth()
    res.json(status)
  })

  app.use(jsonErrorHandler)

  return app
}
