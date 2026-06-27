import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

async function read(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function exists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function main() {
  const ollamaClientExists = await exists('electron/backend/ollama/client.js')
  assert.equal(ollamaClientExists, false, 'ollama runtime module should be removed in deepseek-only mode')

  const modelConfig = await read('electron/backend/model/config.js')
  const deepseekClient = await read('electron/backend/model/deepseek/client.js')
  const server = await read('electron/server.js')
  const appVue = await read('src/renderer/App.vue')
  const packageJson = await read('package.json')

  assert.match(modelConfig, /provider:\s*'deepseek'/, 'model config should hardcode deepseek provider')
  assert.match(deepseekClient, /DeepSeek/, 'deepseek client should remain the only runtime model client')
  assert.match(server, /checkModelHealth/, 'server should expose deepseek health check')
  assert.match(server, /\/api\/model\/status/, 'server should expose /api/model/status')
  assert.match(appVue, /DeepSeek/, 'renderer should present DeepSeek status to the user')
  assert.doesNotMatch(appVue, /Ollama|本地模型可切换|切换模型/, 'renderer should not present local model switching as product capability')
  assert.doesNotMatch(packageJson, /ollama/i, 'package scripts should not reference ollama runtime flows')

  console.log('verify-task130-deepseek-only: passed')
}

main().catch((error) => {
  console.error('verify-task130-deepseek-only: failed')
  console.error(error?.message ?? error)
  process.exit(1)
})
