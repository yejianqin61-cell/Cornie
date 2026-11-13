import { runReminderTick } from './scheduler.js'

export function startDesktopReminders({
  store,
  notify,
  sendToPet,
  intervalMs = 60_000,
  now = () => new Date(),
  timers = { setInterval, clearInterval }
}) {
  const deliver = (payload) => {
    try {
      notify?.(payload)
    } catch (error) {
      console.error('[reminders] notify failed', error)
    }
    try {
      sendToPet?.(payload)
    } catch (error) {
      console.error('[reminders] pet delivery failed', error)
    }
  }

  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      await runReminderTick({ store, now: now(), notify: deliver })
    } catch (error) {
      console.error('[reminders] tick failed', error)
    } finally {
      running = false
    }
  }

  const first = tick()
  const handle = timers.setInterval(tick, intervalMs)
  return {
    stop() {
      timers.clearInterval(handle)
    },
    // 供测试等待启动时那次 tick 完成
    ready: first,
    tick
  }
}
