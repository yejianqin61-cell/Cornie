import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFile(path.join(repoRoot, file), 'utf8')

async function main() {
  const [mainProcess, server, app] = await Promise.all([
    read('electron/main.js'),
    read('electron/server.js'),
    read('src/renderer/App.vue')
  ])

  assert.match(mainProcess, /dialog\.showErrorBox\(/, 'startup must show a visible port error')
  assert.match(mainProcess, /server\.once\(['"]error['"]/, 'startup must observe listen failures')
  assert.match(server, /origin === ['"]null['"]/, 'packaged file pages need an explicit null-origin policy')
  assert.match(server, /ready:\s*true/, 'health must be a startup handshake')
  assert.match(app, /getHealth\(/, 'renderer must wait for the health handshake')
  assert.match(app, /apiReady/, 'renderer must gate UI on API readiness')

  console.log('verify-phase5-startup-boundaries: passed')
}

main().catch((error) => {
  console.error('verify-phase5-startup-boundaries: failed')
  console.error(error?.message ?? error)
  process.exit(1)
})
