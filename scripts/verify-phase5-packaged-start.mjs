import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executable = path.join(repoRoot, 'release', 'win-unpacked', 'Cornie.exe')
const date = '2099-01-02'

async function waitForHealth(child) {
  const deadline = Date.now() + 15_000
  let lastError = null
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:5174/api/health')
      if (response.ok) return response.json()
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  const logs = [child?.stdoutText, child?.stderrText].filter(Boolean).join('\n')
  throw new Error(`packaged API did not become healthy: ${lastError?.message ?? 'timeout'}${logs ? `\n${logs}` : ''}`)
}

function launch(userData) {
  const child = spawn(executable, [`--user-data-dir=${userData}`], {
    cwd: repoRoot,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  child.stdoutText = ''
  child.stderrText = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => { child.stdoutText += chunk })
  child.stderr.on('data', (chunk) => { child.stderrText += chunk })
  child.once('error', (error) => {
    child.spawnError = error
  })
  return child
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
  const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-phase5-'))
  let child = launch(userData)
  try {
    const health = await waitForHealth(child)
    assert.equal(health.ok, true)

    const writeResponse = await fetch(`http://127.0.0.1:5174/api/entries/${date}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userText: 'phase5-packaged-demo', cornieText: 'persist-me' })
    })
    assert.equal(writeResponse.ok, true)
    const written = await writeResponse.json()
    assert.equal(written.entry.userText, 'phase5-packaged-demo')

    const firstRead = await fetch(`http://127.0.0.1:5174/api/entries/${date}`).then((response) => response.json())
    assert.equal(firstRead.entry.cornieText, 'persist-me')
    await stop(child)

    child = launch(userData)
    const restartedHealth = await waitForHealth(child)
    assert.equal(restartedHealth.ok, true)
    const secondRead = await fetch(`http://127.0.0.1:5174/api/entries/${date}`).then((response) => response.json())
    assert.equal(secondRead.entry.userText, 'phase5-packaged-demo')
    assert.equal(secondRead.entry.cornieText, 'persist-me')
    console.log('verify-phase5-packaged-start: passed')
  } finally {
    await stop(child)
    await fs.rm(userData, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('verify-phase5-packaged-start: failed')
  console.error(error?.stack ?? error)
  process.exitCode = 1
})
