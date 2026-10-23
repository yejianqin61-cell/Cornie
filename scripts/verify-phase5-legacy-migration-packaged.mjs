import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import initSqlJs from 'sql.js'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = process.env.CORNIE_RELEASE_DIR || 'release'
const executable = path.join(repoRoot, releaseDir, 'win-unpacked', 'Cornie.exe')
const sourceDb = path.join(process.env.APPDATA, 'cornie', 'cornie.sqlite3')

function launch(userData) {
  return spawn(executable, [`--user-data-dir=${userData}`], {
    cwd: repoRoot,
    windowsHide: true,
    stdio: 'ignore'
  })
}

async function waitForHealth() {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:5174/api/health')
      if (response.ok) return response.json()
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('packaged app did not become healthy during legacy migration check')
}

async function stop(child) {
  if (!child || child.exitCode !== null) return
  child.kill()
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 2_000)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

async function main() {
  await fs.access(executable)
  await fs.access(sourceDb)
  const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-phase5-legacy-'))
  await fs.copyFile(sourceDb, path.join(userData, 'cornie.sqlite3'))
  let app = launch(userData)
  try {
    const health = await waitForHealth()
    assert.equal(health.ok, true)
    const settings = await fetch('http://127.0.0.1:5174/api/settings/model').then((response) => response.json())
    assert.equal(settings.settings.hasApiKey, true)
    await stop(app)
    app = null

    const SQL = await initSqlJs()
    const db = new SQL.Database(await fs.readFile(path.join(userData, 'cornie.sqlite3')))
    const rows = db.exec('select value from meta where key="settings.model.deepseek.apiKey"')
    const value = String(rows[0]?.values?.[0]?.[0] ?? '')
    db.close()
    assert.match(value, /^safeStorage:v1:/)
    console.log('verify-phase5-legacy-migration-packaged: passed')
  } finally {
    await stop(app)
    await fs.rm(userData, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  }
}

main().catch((error) => {
  console.error('verify-phase5-legacy-migration-packaged: failed')
  console.error(error?.stack ?? error)
  process.exitCode = 1
})
