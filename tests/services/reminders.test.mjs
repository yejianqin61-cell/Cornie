import { runReminderTick } from '../../electron/backend/reminders/scheduler.js'
import { saveScheduleEntry, saveTodoEntry, updateScheduleEntryStatus, updateTodoEntryStatus } from '../../electron/db.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

const at = (text) => new Date(text)

async function withTick(run) {
  const harness = await createServiceHarness('reminders')
  const sent = []
  const tick = async (when) =>
    runReminderTick({ store: harness.store, now: at(when), notify: (n) => void sent.push(n) })
  try {
    await run({ store: harness.store, sent, tick })
  } finally {
    await harness.close()
  }
}

const schedule = (store, title, startAt, extra = {}) =>
  saveScheduleEntry(store, { title, startAt, status: 'scheduled', ...extra })
const todo = (store, title, dueAt, extra = {}) => saveTodoEntry(store, { title, dueAt, status: 'pending', ...extra })

await withTick(async ({ store, sent, tick }) => {
  await tick('2026-09-16T09:00')
  schedule(store, '周会', '2026-09-16T10:30')
  await tick('2026-09-16T09:59')
  assert(sent.length === 0, 'case 1: nothing before the lead time', sent)
  await tick('2026-09-16T10:00')
  assert(sent.length === 1 && sent[0].body.includes('周会'), 'case 1: one reminder with the title', sent)
  // case 2: no repeat
  const again = await tick('2026-09-16T10:05')
  assert(again.delivered === 0 && sent.length === 1, 'case 2: no repeat', sent)
})

await withTick(async ({ store, sent, tick }) => {
  await tick('2026-09-16T09:00')
  const cancelled = schedule(store, '取消的', '2026-09-16T10:00')
  updateScheduleEntryStatus(store, { id: cancelled.id, status: 'cancelled' })
  const done = todo(store, '做完的', '2026-09-16T10:00')
  updateTodoEntryStatus(store, { id: done.id, status: 'done' })
  todo(store, '没有期限', null)
  await tick('2026-09-16T12:00')
  assert(sent.length === 0, 'case 3: cancelled, done and undated are ignored', sent)
})

await withTick(async ({ store, sent, tick }) => {
  schedule(store, '昨天的', '2026-09-15T10:00')
  schedule(store, '一小时后', '2026-09-16T10:00')
  await tick('2026-09-16T09:00')
  assert(sent.length === 0, 'case 4: first run only records the start', sent)
  await tick('2026-09-16T09:30')
  assert(sent.length === 1 && sent[0].body === '一小时后', 'case 4: the future schedule fires, the old one never does', sent)
})

await withTick(async ({ store, sent, tick }) => {
  await tick('2026-09-16T09:00')
  schedule(store, 'A', '2026-09-16T10:00')
  schedule(store, 'B', '2026-09-16T11:00')
  todo(store, 'C', '2026-09-16T11:30')
  await tick('2026-09-16T13:00')
  assert(sent.length === 3, 'case 5: three individual notifications', sent)
  const rerun = await tick('2026-09-16T13:05')
  assert(rerun.delivered === 0 && sent.length === 3, 'case 5: nothing more afterwards', sent)
})

await withTick(async ({ store, sent, tick }) => {
  await tick('2026-09-16T09:00')
  for (const [i, t] of ['10:00', '10:10', '10:20', '10:30', '10:40'].entries()) schedule(store, `事${i + 1}`, `2026-09-16T${t}`)
  await tick('2026-09-16T13:00')
  assert(sent.length === 1 && sent[0].title === '错过了 5 条提醒', 'case 6: one merged notification', sent)
  assert(sent[0].body === '事1、事2、事3、事4、事5', 'case 6: body lists titles', sent)
  const rerun = await tick('2026-09-16T13:05')
  assert(rerun.delivered === 0, 'case 6: all five recorded as sent', rerun)
})

await withTick(async ({ store, sent, tick }) => {
  await tick('2026-09-16T09:00')
  const s = schedule(store, '改期', '2026-09-16T10:00')
  await tick('2026-09-16T09:40')
  assert(sent.length === 1, 'case 7: first reminder', sent)
  schedule(store, '改期', '2026-09-16T15:00', { id: s.id })
  await tick('2026-09-16T14:00')
  assert(sent.length === 1, 'case 7: not yet due after move', sent)
  await tick('2026-09-16T14:30')
  assert(sent.length === 2, 'case 7: reminds again for the new time', sent)
})

console.log('tests/services/reminders.test.mjs: passed 7/7')
