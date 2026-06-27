import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from '../electron/server.js'
import { openDb } from '../electron/db.js'

async function listen(app) {
  const server = createHttpServer(app)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('failed to bind test server')
  }
  return { server, port: address.port }
}

async function requestJson(port, pathname, init = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    ...init
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    throw new Error(`${pathname} failed: ${res.status} ${text}`)
  }

  return data
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-task124-'))
  const dbPath = path.join(tempRoot, 'task124.sqlite')
  const store = await openDb(dbPath)
  const app = createServer({ store })
  const { server, port } = await listen(app)

  try {
    const todoCategory = await requestJson(port, '/api/todo-categories', {
      method: 'POST',
      body: JSON.stringify({
        id: 'todo_task124',
        name: 'QW124A',
        sortOrder: 12
      })
    })
    assert.equal(todoCategory.category.id, 'todo_task124')

    const todoEntry = await requestJson(port, '/api/todos', {
      method: 'POST',
      body: JSON.stringify({
        title: '整理 124 验收',
        categoryId: 'todo_task124',
        categoryName: 'QW124A'
      })
    })
    assert.equal(todoEntry.entry.status, 'pending')

    const todoOpen = await requestJson(port, '/api/todos?view=open')
    assert.ok(todoOpen.items.some((item) => item.id === todoEntry.entry.id))

    const completedTodo = await requestJson(port, `/api/todos/${encodeURIComponent(todoEntry.entry.id)}/complete`, {
      method: 'POST'
    })
    assert.equal(completedTodo.entry.status, 'done')

    const completedList = await requestJson(port, '/api/todos?view=completed')
    assert.ok(completedList.items.some((item) => item.id === todoEntry.entry.id))

    const reopenedTodo = await requestJson(port, `/api/todos/${encodeURIComponent(todoEntry.entry.id)}/reopen`, {
      method: 'POST'
    })
    assert.equal(reopenedTodo.entry.status, 'pending')

    const updatedTodoCategory = await requestJson(port, '/api/todo-categories/todo_task124', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'QW124B'
      })
    })
    assert.equal(updatedTodoCategory.category.name, 'QW124B')

    const reorderedTodoCategory = await requestJson(port, '/api/todo-categories/todo_task124/reorder', {
      method: 'POST',
      body: JSON.stringify({ sortOrder: 33 })
    })
    assert.equal(reorderedTodoCategory.category.sortOrder, 33)

    await requestJson(port, '/api/todo-categories/todo_task124', {
      method: 'PUT',
      body: JSON.stringify({
        isActive: false
      })
    })

    const restoredTodoCategory = await requestJson(port, '/api/todo-categories/todo_task124/restore', {
      method: 'POST'
    })
    assert.equal(restoredTodoCategory.category.isActive, true)

    const scheduleCategory = await requestJson(port, '/api/schedule-categories', {
      method: 'POST',
      body: JSON.stringify({
        id: 'schedule_task124',
        name: 'ER124A',
        sortOrder: 21
      })
    })
    assert.equal(scheduleCategory.category.id, 'schedule_task124')

    const scheduleEntry = await requestJson(port, '/api/schedules', {
      method: 'POST',
      body: JSON.stringify({
        title: '参加 124 验收会议',
        startAt: '2026-06-28T09:00:00.000Z',
        endAt: '2026-06-28T10:00:00.000Z',
        categoryId: 'schedule_task124',
        categoryName: 'ER124A'
      })
    })
    assert.equal(scheduleEntry.entry.status, 'scheduled')

    const upcomingSchedules = await requestJson(port, '/api/schedules?view=upcoming')
    assert.ok(Array.isArray(upcomingSchedules.items))

    const cancelledSchedule = await requestJson(port, `/api/schedules/${encodeURIComponent(scheduleEntry.entry.id)}/cancel`, {
      method: 'POST'
    })
    assert.equal(cancelledSchedule.entry.status, 'cancelled')

    const cancelledList = await requestJson(port, '/api/schedules?view=cancelled')
    assert.ok(cancelledList.items.some((item) => item.id === scheduleEntry.entry.id))

    const restoredSchedule = await requestJson(port, `/api/schedules/${encodeURIComponent(scheduleEntry.entry.id)}/restore`, {
      method: 'POST'
    })
    assert.equal(restoredSchedule.entry.status, 'scheduled')

    const updatedScheduleCategory = await requestJson(port, '/api/schedule-categories/schedule_task124', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'ER124B'
      })
    })
    assert.equal(updatedScheduleCategory.category.name, 'ER124B')

    const reorderedScheduleCategory = await requestJson(port, '/api/schedule-categories/schedule_task124/reorder', {
      method: 'POST',
      body: JSON.stringify({ sortOrder: 44 })
    })
    assert.equal(reorderedScheduleCategory.category.sortOrder, 44)

    await requestJson(port, '/api/schedule-categories/schedule_task124', {
      method: 'PUT',
      body: JSON.stringify({
        isActive: false
      })
    })

    const restoredScheduleCategory = await requestJson(port, '/api/schedule-categories/schedule_task124/restore', {
      method: 'POST'
    })
    assert.equal(restoredScheduleCategory.category.isActive, true)

    const deletedTodo = await requestJson(port, `/api/todos/${encodeURIComponent(todoEntry.entry.id)}`, {
      method: 'DELETE'
    })
    assert.equal(deletedTodo.entry.status, 'cancelled')

    const deletedSchedule = await requestJson(port, `/api/schedules/${encodeURIComponent(scheduleEntry.entry.id)}`, {
      method: 'DELETE'
    })
    assert.equal(deletedSchedule.entry.id, scheduleEntry.entry.id)

    console.log('verify-task124-todo-schedule-human-routes: passed')
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('verify-task124-todo-schedule-human-routes: failed')
  console.error(error?.message ?? error)
  process.exit(1)
})
