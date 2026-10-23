import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDemoMemorySet } from '../electron/backend/memory-wiki/demoMemory.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executable = path.join(repoRoot, 'release', 'win-unpacked', 'Cornie.exe')
const baseUrl = 'http://127.0.0.1:5174/api'

function launch(userData) {
  return spawn(executable, [`--user-data-dir=${userData}`], {
    cwd: repoRoot,
    windowsHide: true,
    stdio: 'ignore'
  })
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

async function waitForHealth() {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) return response.json()
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('release API did not become healthy')
}

async function request(pathname, options) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options?.headers ?? {}) }
  })
  const data = response.status === 204 ? null : await response.json()
  assert.equal(response.ok, true, `${options?.method ?? 'GET'} ${pathname} failed: ${JSON.stringify(data)}`)
  return data
}

async function exerciseEightModules(userData) {
  const date = '2099-01-04'
  const diary = await request(`/entries/${date}`, {
    method: 'PUT',
    body: JSON.stringify({ userText: 'phase5 release diary', cornieText: 'stored' })
  })
  assert.equal(diary.entry.userText, 'phase5 release diary')
  const categories = await request('/ledger/categories?type=expense')
  const expense = await request('/ledger/entries/expense', {
    method: 'POST',
    body: JSON.stringify({ amount: 18, categoryId: categories.items[0].id, item: '演示咖啡', occurredAt: `${date}T09:00:00.000+08:00` })
  })
  assert.equal(expense.entry.amount, 18)
  const todo = await request('/todos', { method: 'POST', body: JSON.stringify({ title: '发布检查待办' }) })
  assert.equal(todo.entry.title, '发布检查待办')
  const schedule = await request('/schedules', {
    method: 'POST',
    body: JSON.stringify({ title: '发布演示', startAt: `${date}T10:00:00.000+08:00` })
  })
  assert.equal(schedule.entry.title, '发布演示')
  const observation = await request('/observations', {
    method: 'POST',
    body: JSON.stringify({ date, type: 'note', title: '发布检查', content: '八模块 smoke 已完成。' })
  })
  assert.equal(observation.observation.title, '发布检查')
  const chatlogs = await request(`/chatlogs/${date}`)
  assert.ok(Array.isArray(chatlogs.messages))
  const settings = await request('/settings/model')
  assert.equal(settings.settings.hasApiKey, false)

  await loadDemoMemorySet({ baseDir: userData })
  const pages = await request('/memory-wiki/pages')
  assert.equal(pages.total, 4)
  const trace = await request('/memory-wiki/pages/demo_preference_coffee/source-trace')
  assert.equal(trace.trace.page.pageId, 'demo_preference_coffee')
  const archived = await request('/memory-wiki/pages/demo_preference_coffee/archive', { method: 'POST' })
  assert.equal(archived.page.status, 'archived')
  const restored = await request('/memory-wiki/pages/demo_preference_coffee/restore', { method: 'POST' })
  assert.notEqual(restored.page.status, 'archived')
  await request('/settings/model', { method: 'DELETE' })
}

async function main() {
  await fs.access(executable)
  const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-phase5-release-'))
  let app = launch(userData)
  try {
    const health = await waitForHealth()
    assert.equal(health.ok, true)
    assert.equal(health.ready, true)
    await exerciseEightModules(userData)
    await stop(app)
    app = launch(userData)
    assert.equal((await waitForHealth()).ok, true)
    const diary = await request('/entries/2099-01-04')
    assert.equal(diary.entry.cornieText, 'stored')
    const pages = await request('/memory-wiki/pages')
    assert.equal(pages.total, 4)
    console.log('verify-phase5-release: passed')
  } finally {
    await stop(app)
    await fs.rm(userData, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  }
}

main().catch((error) => {
  console.error('verify-phase5-release: failed')
  console.error(error?.stack ?? error)
  process.exitCode = 1
})
