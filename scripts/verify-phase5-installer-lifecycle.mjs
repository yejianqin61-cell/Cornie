import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const installer = path.join(repoRoot, 'release', 'Cornie Setup 0.1.0.exe')

function run(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { cwd: repoRoot, windowsHide: true, stdio: 'ignore' })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
}

function launchApp(executable, userData) {
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
  throw new Error('installed Cornie API did not become healthy')
}

async function waitForMissing(filePath) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    try {
      await fs.access(filePath)
    } catch {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`path still exists after uninstall: ${filePath}`)
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
  await fs.access(installer)
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-phase5-installer-'))
  const installDir = path.join(root, 'installed')
  const userData = path.join(root, 'user-data')
  const installedExecutable = path.join(installDir, 'Cornie.exe')
  let app = null
  try {
    assert.equal((await run(installer, ['/S', `/D=${installDir}`])).code, 0)
    await fs.access(installedExecutable)

    app = launchApp(installedExecutable, userData)
    assert.equal((await waitForHealth()).ok, true)
    const write = await fetch('http://127.0.0.1:5174/api/entries/2099-01-03', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userText: 'installer-lifecycle', cornieText: 'keep-on-upgrade' })
    })
    assert.equal(write.ok, true)
    await stop(app)
    app = null

    assert.equal((await run(installer, ['/S', `/D=${installDir}`])).code, 0)
    app = launchApp(installedExecutable, userData)
    assert.equal((await waitForHealth()).ok, true)
    const reread = await fetch('http://127.0.0.1:5174/api/entries/2099-01-03').then((response) => response.json())
    assert.equal(reread.entry.userText, 'installer-lifecycle')
    await stop(app)
    app = null

    const uninstaller = (await fs.readdir(installDir)).find((name) => /^Uninstall Cornie\.exe$/i.test(name))
    assert.ok(uninstaller, 'NSIS uninstaller is missing')
    assert.equal((await run(path.join(installDir, uninstaller), ['/S'])).code, 0)
    await waitForMissing(installedExecutable)
    await fs.access(path.join(userData, 'cornie.sqlite3'))
    console.log('verify-phase5-installer-lifecycle: passed')
  } finally {
    await stop(app)
    await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 })
  }
}

main().catch((error) => {
  console.error('verify-phase5-installer-lifecycle: failed')
  console.error(error?.stack ?? error)
  process.exitCode = 1
})
