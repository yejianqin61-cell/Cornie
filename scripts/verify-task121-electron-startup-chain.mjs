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

async function main() {
  const mainEntry = await read('electron/main.cjs')
  const mainProcess = await read('electron/main.js')
  const server = await read('electron/server.js')
  const preload = await read('electron/preload.cjs')

  assert.match(mainEntry, /import\('\.\/main\.js'\)/, 'main.cjs should bridge into main.js')
  assert.doesNotMatch(mainEntry, /process\.exit\s*\(/, 'main.cjs should not exit early')

  assert.match(mainProcess, /app\.whenReady\(\)\.then\(async\s*\(\)\s*=>/, 'main.js should bootstrap on app.whenReady')
  assert.match(mainProcess, /createMainWindow\(/, 'main.js should define main window creation')
  assert.match(mainProcess, /createCornieWindow\(/, 'main.js should define cornie window creation')
  assert.match(mainProcess, /startLocalApi\(/, 'main.js should start local API')
  assert.match(mainProcess, /api\.listen\(5174,\s*'127\.0\.0\.1'\)/, 'local API should listen on 5174')
  assert.match(mainProcess, /loadURL\('http:\/\/127\.0\.0\.1:5173'\)/, 'main window should load renderer dev URL')
  assert.match(mainProcess, /loadURL\('http:\/\/127\.0\.0\.1:5173\/cornie\.html'\)/, 'cornie window should load cornie dev URL')

  assert.match(server, /createServer\s*\(\{\s*store\s*\}\)/, 'server factory should exist')
  assert.match(server, /app\.get\('\/api\/health'/, 'server should expose health endpoint')
  assert.match(preload, /contextBridge\.exposeInMainWorld\('cornieDesktop'/, 'preload should expose cornieDesktop bridge')

  console.log('verify-task121-electron-startup-chain: passed')
}

main().catch((error) => {
  console.error('verify-task121-electron-startup-chain: failed')
  console.error(error?.message ?? error)
  process.exit(1)
})
