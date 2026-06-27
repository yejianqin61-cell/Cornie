import { randomUUID } from 'node:crypto'
import { openDb, getScheduleEntry, listTodoCategories, listScheduleCategories } from '../electron/db.js'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerTodoTools } from '../electron/backend/todo/tools.js'
import { registerScheduleTools } from '../electron/backend/schedule/tools.js'
import { cleanupSqliteFile, createRuntimeSqlitePath } from './tmp-artifacts.mjs'

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

async function main() {
  const dbPath = await createRuntimeSqlitePath(`task048-verify-${randomUUID()}`)
  const store = await openDb(dbPath)

  try {
    registerTodoTools(store, { registerTool })
    registerScheduleTools(store, { registerTool })

    const todoCategoryDelete = getTool('todo_category.delete')
    const scheduleCategoryDelete = getTool('schedule_category.delete')
    const scheduleCreate = getTool('schedule.create')
    const scheduleCancel = getTool('schedule.cancel')
    const scheduleDelete = getTool('schedule.delete')

    assert(todoCategoryDelete && scheduleCategoryDelete && scheduleCreate && scheduleCancel && scheduleDelete, 'missing task048 tools')

    const todoDeleted = (await todoCategoryDelete.handler({
      id: 'todo_life',
      name: '生活'
    })).result
    assert(todoDeleted?.isActive === false, 'expected todo category inactive', todoDeleted)
    assert(!listTodoCategories(store).some((item) => item.id === 'todo_life'), 'expected todo_life hidden after delete')

    const scheduleCategoryDeleted = (await scheduleCategoryDelete.handler({
      id: 'schedule_general',
      name: '日程'
    })).result
    assert(scheduleCategoryDeleted?.isActive === false, 'expected schedule category inactive', scheduleCategoryDeleted)
    assert(
      !listScheduleCategories(store).some((item) => item.id === 'schedule_general'),
      'expected schedule_general hidden after delete'
    )

    const cancelled = (await scheduleCreate.handler({
      title: '带猫复查',
      startAt: '2026-06-28T09:00:00.000Z',
      categoryId: 'schedule_meeting',
      categoryName: '会议',
      sourceText: '明早带猫复查'
    })).result
    assert(cancelled?.id, 'expected created schedule for cancel path', cancelled)

    const cancelResult = (await scheduleCancel.handler({ id: cancelled.id })).result
    assert(cancelResult?.status === 'cancelled', 'expected cancel to keep record but mark cancelled', cancelResult)
    assert(getScheduleEntry(store, cancelled.id)?.status === 'cancelled', 'expected cancelled entry still exists')

    const deleted = (await scheduleCreate.handler({
      title: '带猫打疫苗',
      startAt: '2026-06-29T09:00:00.000Z',
      categoryId: 'schedule_meeting',
      categoryName: '会议',
      sourceText: '后天带猫打疫苗'
    })).result
    assert(deleted?.id, 'expected created schedule for delete path', deleted)

    const deleteResult = (await scheduleDelete.handler({ id: deleted.id })).result
    assert(deleteResult?.id === deleted.id, 'expected delete returns original entry', deleteResult)
    assert(getScheduleEntry(store, deleted.id) === null, 'expected deleted schedule missing afterwards')

    console.log('verify-task048-tools: passed')
  } finally {
    try {
      store.close()
    } catch {}
    cleanupSqliteFile(dbPath)
  }
}

main().catch((error) => {
  console.error('verify-task048-tools: failed')
  console.error(error?.message ?? error)
  if (error?.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2))
  }
  process.exit(1)
})
