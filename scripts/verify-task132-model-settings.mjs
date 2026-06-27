import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { openDb } from '../electron/db.js'
import { createServer } from '../electron/server.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-settings-132-'))
  const dbPath = path.join(tempRoot, 'settings.sqlite')
  const previousEnv = {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL,
    model: process.env.DEEPSEEK_MODEL,
    timeoutMs: process.env.DEEPSEEK_TIMEOUT_MS
  }

  delete process.env.DEEPSEEK_API_KEY
  delete process.env.DEEPSEEK_BASE_URL
  delete process.env.DEEPSEEK_MODEL
  delete process.env.DEEPSEEK_TIMEOUT_MS

  let store = null
  let server = null

  try {
    store = await openDb(dbPath)
    const app = createServer({ store })
    server = app.listen(0)
    const port = server.address().port

    const initialSettingsRes = await fetch(`http://127.0.0.1:${port}/api/settings/model`)
    const initialSettingsJson = await initialSettingsRes.json()
    assert.equal(initialSettingsJson.settings.configured, false)
    assert.equal(initialSettingsJson.settings.hasApiKey, false)

    const saveRes = await fetch(`http://127.0.0.1:${port}/api/settings/model`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'sk-test-deepseek-key',
        baseUrl: 'https://api.deepseek.com/',
        model: 'deepseek-chat',
        timeoutMs: 45000
      })
    })
    const saveJson = await saveRes.json()
    assert.equal(saveJson.settings.configured, true)
    assert.equal(saveJson.settings.hasApiKey, true)
    assert.match(saveJson.settings.maskedApiKey, /^sk-t\*\*\*/)

    const statusRes = await fetch(`http://127.0.0.1:${port}/api/model/status`)
    const statusJson = await statusRes.json()
    assert.equal(statusJson.configured, true)
    assert.equal(statusJson.provider, 'deepseek')

    const clearRes = await fetch(`http://127.0.0.1:${port}/api/settings/model`, {
      method: 'DELETE'
    })
    const clearJson = await clearRes.json()
    assert.equal(clearJson.settings.configured, false)

    const statusAfterClearRes = await fetch(`http://127.0.0.1:${port}/api/model/status`)
    const statusAfterClearJson = await statusAfterClearRes.json()
    assert.equal(statusAfterClearJson.configured, false)
    assert.equal(statusAfterClearJson.reason, 'missing_api_key')

    console.log('verify-task132-model-settings: passed')
  } finally {
    if (server) {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
    try {
      store?.close?.()
    } catch {}
    await fs.rm(tempRoot, { recursive: true, force: true })

    if (previousEnv.apiKey === undefined) delete process.env.DEEPSEEK_API_KEY
    else process.env.DEEPSEEK_API_KEY = previousEnv.apiKey
    if (previousEnv.baseUrl === undefined) delete process.env.DEEPSEEK_BASE_URL
    else process.env.DEEPSEEK_BASE_URL = previousEnv.baseUrl
    if (previousEnv.model === undefined) delete process.env.DEEPSEEK_MODEL
    else process.env.DEEPSEEK_MODEL = previousEnv.model
    if (previousEnv.timeoutMs === undefined) delete process.env.DEEPSEEK_TIMEOUT_MS
    else process.env.DEEPSEEK_TIMEOUT_MS = previousEnv.timeoutMs
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
