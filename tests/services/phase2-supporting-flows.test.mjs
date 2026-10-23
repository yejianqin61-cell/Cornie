import express from 'express'

import { diaryRoutes } from '../../electron/backend/diary/routes.js'
import { diaryService } from '../../electron/backend/diary/service.js'
import { jsonErrorHandler } from '../../electron/backend/http/middleware.js'
import { observationRoutes } from '../../electron/backend/observation/routes.js'
import { settingsRoutes } from '../../electron/backend/settings/routes.js'
import { createSettingsService } from '../../electron/backend/settings/service.js'
import { getEntry, upsertEntry } from '../../src/renderer/api/diary.js'
import { createObservation, deleteObservation, getObservation } from '../../src/renderer/api/observation.js'
import { clearModelSettings, getModelSettings, saveModelSettings } from '../../src/renderer/api/settings.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'
import { createTestSecretStore } from '../shared/secret-store.mjs'

const API_BASE = 'http://127.0.0.1:5174'

async function withApi(store, fn) {
  const app = express()
  app.use(express.json())
  app.use('/api', diaryRoutes({ diary: diaryService(store) }))
  app.use('/api', observationRoutes({ store }))
  app.use('/api', settingsRoutes({ settings: createSettingsService(store, { secretStore: createTestSecretStore() }) }))
  app.use((_req, res) => res.status(404).json({ error: 'route not found' }))
  app.use(jsonErrorHandler)

  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const realFetch = globalThis.fetch
  globalThis.fetch = (url, options) => realFetch(String(url).replace(API_BASE, base), options)
  try {
    await fn()
  } finally {
    globalThis.fetch = realFetch
    await new Promise((resolve) => server.close(resolve))
  }
}

async function testSupportingFlows() {
  const harness = await createServiceHarness('phase2-supporting-flows')
  try {
    await withApi(harness.store, async () => {
      const date = '2026-10-22'
      await upsertEntry(date, { userText: '完成了 Phase 2 的联调验证。' })
      const diary = await getEntry(date)
      assert(diary.entry?.userText === '完成了 Phase 2 的联调验证。', 'expected diary text after reload', diary)

      const created = await createObservation({
        date,
        type: 'note',
        title: '联调观察',
        content: '支持流程通过真实 HTTP 验证。',
      })
      const observation = await getObservation(created.observation.id)
      assert(observation.observation?.title === '联调观察', 'expected observation after reload', observation)
      await deleteObservation(created.observation.id)
      await assertMissingObservation(created.observation.id)
      await assertInvalidObservation()

      const saved = await saveModelSettings({
        apiKey: 'phase2-test-key',
        baseUrl: 'https://example.test/',
        model: 'phase2-model',
      })
      assert(saved.settings?.baseUrl === 'https://example.test', 'expected normalized settings URL', saved)
      assert(saved.settings?.model === 'phase2-model', 'expected model after save', saved)
      assert(!JSON.stringify(saved).includes('phase2-test-key'), 'settings response must not expose API key', saved)

      const read = await getModelSettings()
      assert(read.settings?.baseUrl === 'https://example.test', 'expected settings after reload', read)
      await clearModelSettings()
      const cleared = await getModelSettings()
      assert(cleared.settings?.hasApiKey === false, 'expected cleared API key to be unreadable', cleared)
      assert(cleared.settings?.model === '', 'expected cleared model', cleared)
    })
  } finally {
    await harness.close()
  }
}

async function assertMissingObservation(id) {
  try {
    await getObservation(id)
  } catch (error) {
    assert(error.message.includes('找不到这条观察记录'), 'expected missing observation error', error)
    return
  }
  throw new Error('expected deleted observation to return 404')
}

async function assertInvalidObservation() {
  const response = await fetch(`${API_BASE}/api/observations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-10-22', content: '缺少标题' }),
  })
  assert(response.status === 400, 'expected invalid observation to return 400', { status: response.status })
}

await testSupportingFlows()
console.log('tests/services/phase2-supporting-flows.test.mjs: passed 1/1')
