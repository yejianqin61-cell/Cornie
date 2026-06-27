import { randomUUID } from 'node:crypto'
import { openDb } from '../electron/db.js'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerTodoTools } from '../electron/backend/todo/tools.js'
import { cleanupSqliteFile, createRuntimeSqlitePath } from './tmp-artifacts.mjs'

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

async function main() {
  const dbPath = await createRuntimeSqlitePath(`task100-verify-${randomUUID()}`)
  const store = await openDb(dbPath)

  try {
    registerTodoTools(store, { registerTool })

    const create = getTool('todo.create')
    const complete = getTool('todo.complete')
    const reopen = getTool('todo.reopen')
    const listOpen = getTool('todo.list_open')
    const listCompleted = getTool('todo.list_completed')

    assert(create && complete && reopen && listOpen && listCompleted, 'missing task100 tools')

    const laundry = (
      await create.handler({
        title: '洗衣服',
        categoryId: 'todo_life',
        categoryName: '生活',
        dueAt: '2026-06-28T10:00:00.000Z',
        sourceText: '明天要洗衣服'
      })
    ).result

    const study = (
      await create.handler({
        title: '复习 deepseek tool calling',
        categoryId: 'todo_study',
        categoryName: '学习',
        dueAt: '2026-06-28T21:00:00.000Z',
        sourceText: '晚上复习'
      })
    ).result

    const completed = (await complete.handler({ id: laundry.id })).result
    assert(completed?.status === 'done', 'expected todo completed', completed)

    const completedList = (await listCompleted.handler({})).result
    assert(Array.isArray(completedList), 'expected completed list array', completedList)
    assert(completedList.some((item) => item.id === laundry.id), 'expected completed todo in completed list', completedList)
    assert(!completedList.some((item) => item.id === study.id), 'expected pending todo excluded from completed list', completedList)

    const reopened = (await reopen.handler({ id: laundry.id })).result
    assert(reopened?.status === 'pending', 'expected reopened todo pending', reopened)

    const openList = (await listOpen.handler({})).result
    assert(Array.isArray(openList), 'expected open list array', openList)
    assert(openList.some((item) => item.id === laundry.id), 'expected reopened todo back in open list', openList)
    assert(openList.some((item) => item.id === study.id), 'expected untouched pending todo in open list', openList)

    const completedAfterReopen = (await listCompleted.handler({})).result
    assert(!completedAfterReopen.some((item) => item.id === laundry.id), 'expected reopened todo removed from completed list', completedAfterReopen)

    console.log('verify-task100-todo-reopen-tools: passed')
  } finally {
    try {
      store.close()
    } catch {}
    cleanupSqliteFile(dbPath)
  }
}

main().catch((error) => {
  console.error('verify-task100-todo-reopen-tools: failed')
  console.error(error?.message ?? error)
  if (error?.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2))
  }
  process.exit(1)
})
