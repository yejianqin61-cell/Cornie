import { randomUUID } from 'node:crypto'
import { openDb } from '../electron/db.js'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerTodoTools } from '../electron/backend/todo/tools.js'
import { registerScheduleTools } from '../electron/backend/schedule/tools.js'

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

async function main() {
  const dbPath = `./tmp-task101-verify-${randomUUID()}.sqlite`
  const store = await openDb(dbPath)

  try {
    registerTodoTools(store, { registerTool })
    registerScheduleTools(store, { registerTool })

    const todoGet = getTool('todo_category.get')
    const todoList = getTool('todo_category.list')
    const todoDelete = getTool('todo_category.delete')
    const todoRestore = getTool('todo_category.restore')
    const todoReorder = getTool('todo_category.reorder')
    const scheduleGet = getTool('schedule_category.get')
    const scheduleList = getTool('schedule_category.list')
    const scheduleDelete = getTool('schedule_category.delete')
    const scheduleRestore = getTool('schedule_category.restore')
    const scheduleReorder = getTool('schedule_category.reorder')

    assert(
      todoGet && todoList && todoDelete && todoRestore && todoReorder && scheduleGet && scheduleList && scheduleDelete && scheduleRestore && scheduleReorder,
      'missing task101 tools'
    )

    const todoCategory = (await todoGet.handler({ id: 'todo_life' })).result
    assert(todoCategory?.id === 'todo_life', 'expected todo_life category', todoCategory)

    const scheduleCategory = (await scheduleGet.handler({ id: 'schedule_general' })).result
    assert(scheduleCategory?.id === 'schedule_general', 'expected schedule_general category', scheduleCategory)

    const todoDeleted = (await todoDelete.handler({ id: 'todo_life', name: '生活' })).result
    assert(todoDeleted?.isActive === false, 'expected todo category disabled', todoDeleted)

    const todoRestored = (await todoRestore.handler({ id: 'todo_life' })).result
    assert(todoRestored?.isActive === true, 'expected todo category restored', todoRestored)

    const todoReordered = (await todoReorder.handler({ id: 'todo_life', sortOrder: 5 })).result
    assert(todoReordered?.sortOrder === 5, 'expected todo category reordered', todoReordered)

    const todoListAfter = (await todoList.handler({})).result
    assert(todoListAfter.items[0]?.id === 'todo_life', 'expected reordered todo category first', todoListAfter)

    const scheduleDeleted = (await scheduleDelete.handler({ id: 'schedule_general', name: '日程' })).result
    assert(scheduleDeleted?.isActive === false, 'expected schedule category disabled', scheduleDeleted)

    const scheduleRestored = (await scheduleRestore.handler({ id: 'schedule_general' })).result
    assert(scheduleRestored?.isActive === true, 'expected schedule category restored', scheduleRestored)

    const scheduleReordered = (await scheduleReorder.handler({ id: 'schedule_general', sortOrder: 5 })).result
    assert(scheduleReordered?.sortOrder === 5, 'expected schedule category reordered', scheduleReordered)

    const scheduleListAfter = (await scheduleList.handler({})).result
    assert(
      scheduleListAfter.items[0]?.id === 'schedule_general',
      'expected reordered schedule category first',
      scheduleListAfter
    )

    console.log('verify-task101-category-management-tools: passed')
  } finally {
    try {
      store.close()
    } catch {}
  }
}

main().catch((error) => {
  console.error('verify-task101-category-management-tools: failed')
  console.error(error?.message ?? error)
  if (error?.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2))
  }
  process.exit(1)
})
