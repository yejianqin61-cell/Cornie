import { startDesktopReminders } from '../../electron/backend/reminders/desktop.js'
import { saveScheduleEntry } from '../../electron/db.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

function fakeTimers() {
  const state = { fn: null, cleared: 0 }
  return {
    state,
    timers: {
      setInterval: (fn) => ((state.fn = fn), 1),
      clearInterval: () => void (state.cleared += 1)
    }
  }
}

const harness = await createServiceHarness('reminders-desktop')
try {
  const { store } = harness
  let clock = new Date('2026-09-16T09:00')
  const notified = []
  const petSent = []
  const { state, timers } = fakeTimers()

  // 先放一条"错过"的日程：起点记在 09:00，之后 10:00 的日程在 09:40 到点，
  // 这里用第二个 handle 模拟"应用重启后补发"。
  const first = startDesktopReminders({ store, notify: () => {}, sendToPet: () => {}, now: () => clock, timers })
  await first.ready
  first.stop()
  saveScheduleEntry(store, { title: '周会', startAt: '2026-09-16T10:00', status: 'scheduled' })

  clock = new Date('2026-09-16T11:00')
  const handle = startDesktopReminders({
    store,
    notify: (n) => notified.push(n),
    sendToPet: (n) => petSent.push(n),
    now: () => clock,
    timers
  })
  await handle.ready
  assert(notified.length === 1 && petSent.length === 1, 'case 1: startup tick notifies both once', { notified, petSent })
  assert(JSON.stringify(notified[0]) === JSON.stringify(petSent[0]), 'case 1: same content', { notified, petSent })

  // case 2
  for (let i = 0; i < 3; i += 1) await state.fn()
  assert(notified.length === 1, 'case 2: no repeats', notified)
  saveScheduleEntry(store, { title: '晚餐', startAt: '2026-09-16T11:20', status: 'scheduled' })
  await state.fn()
  assert(notified.length === 2 && notified[1].body === '晚餐', 'case 2: new due item reminds', notified)

  // case 3: a tick that throws is logged and the next one still runs
  const errors = []
  const origError = console.error
  console.error = (...args) => errors.push(args)
  const broken = {
    ...store,
    db: {
      prepare() {
        throw new Error('boom')
      }
    }
  }
  const bad = startDesktopReminders({ store: broken, notify: () => {}, sendToPet: () => {}, now: () => clock, timers })
  await bad.ready
  await bad.tick()
  console.error = origError
  assert(errors.length >= 2, 'case 3: errors are logged and ticks continue', errors)

  // case 4
  handle.stop()
  assert(state.cleared >= 1, 'case 4: stop clears the interval', state)
} finally {
  await harness.close()
}

console.log('tests/services/reminders-desktop.test.mjs: passed 4/4')
