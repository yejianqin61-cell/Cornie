import { randomUUID } from 'node:crypto'
import { openDb } from '../electron/db.js'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
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
  const dbPath = await createRuntimeSqlitePath(`task102-verify-${randomUUID()}`)
  const store = await openDb(dbPath)

  try {
    registerScheduleTools(store, { registerTool })

    const create = getTool('schedule.create')
    const cancel = getTool('schedule.cancel')
    const restore = getTool('schedule.restore')
    const listUpcoming = getTool('schedule.list_upcoming')
    const listCancelled = getTool('schedule.list_cancelled')

    assert(create && cancel && restore && listUpcoming && listCancelled, 'missing task102 tools')

    const upcoming = (
      await create.handler({
        title: '和铃湾讨论龙虾观察',
        startAt: '2099-06-28T10:00:00.000Z',
        categoryId: 'schedule_general',
        categoryName: '日程',
        sourceText: '安排一个未来日程'
      })
    ).result

    const cancelled = (
      await create.handler({
        title: '取消的体检预约',
        startAt: '2099-06-29T09:00:00.000Z',
        categoryId: 'schedule_reminder',
        categoryName: '提醒',
        sourceText: '这条会被取消'
      })
    ).result

    const cancelResult = (await cancel.handler({ id: cancelled.id })).result
    assert(cancelResult?.status === 'cancelled', 'expected schedule cancelled', cancelResult)

    const upcomingList = (await listUpcoming.handler({})).result
    assert(Array.isArray(upcomingList), 'expected upcoming list array', upcomingList)
    assert(upcomingList.some((item) => item.id === upcoming.id), 'expected scheduled future event in upcoming list', upcomingList)
    assert(!upcomingList.some((item) => item.id === cancelled.id), 'expected cancelled event excluded from upcoming list', upcomingList)

    const cancelledList = (await listCancelled.handler({})).result
    assert(Array.isArray(cancelledList), 'expected cancelled list array', cancelledList)
    assert(cancelledList.some((item) => item.id === cancelled.id), 'expected cancelled event in cancelled list', cancelledList)
    assert(cancelledList.every((item) => item.status === 'cancelled'), 'expected cancelled list only cancelled entries', cancelledList)

    const restored = (await restore.handler({ id: cancelled.id })).result
    assert(restored?.status === 'scheduled', 'expected restored schedule status scheduled', restored)

    const upcomingAfterRestore = (await listUpcoming.handler({})).result
    assert(upcomingAfterRestore.some((item) => item.id === cancelled.id), 'expected restored event back in upcoming list', upcomingAfterRestore)

    console.log('verify-task102-schedule-lifecycle-tools: passed')
  } finally {
    try {
      store.close()
    } catch {}
    cleanupSqliteFile(dbPath)
  }
}

main().catch((error) => {
  console.error('verify-task102-schedule-lifecycle-tools: failed')
  console.error(error?.message ?? error)
  if (error?.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2))
  }
  process.exit(1)
})
