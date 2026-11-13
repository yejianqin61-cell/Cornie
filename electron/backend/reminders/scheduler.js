import { getAppSetting, setAppSetting, listScheduleEntries, listTodoEntries } from '../../db.js'

export const REMINDER_LEAD_MINUTES = 30
export const MERGE_THRESHOLD = 3
const TRACKING_KEY = 'reminders.tracking_started_at'
const MERGED_TITLES_SHOWN = 5

function wasSent(store, key) {
  const stmt = store.db.prepare('select 1 as ok from reminders_sent where key = $key')
  stmt.bind({ $key: key })
  const found = stmt.step()
  stmt.free()
  return found
}

function markSent(store, key, at) {
  store.db.run('insert or ignore into reminders_sent(key, sent_at) values ($key, $at)', {
    $key: key,
    $at: at
  })
}

function collectDue(store, nowMs, trackingStart) {
  const due = []
  for (const s of listScheduleEntries(store, { status: 'scheduled' })) {
    const startMs = new Date(s.startAt).getTime()
    if (!Number.isFinite(startMs) || startMs < trackingStart) continue
    if (nowMs < startMs - REMINDER_LEAD_MINUTES * 60_000) continue
    const key = `schedule:${s.id}:${s.startAt}`
    if (wasSent(store, key)) continue
    due.push({ key, kind: 'schedule', title: s.title, atMs: startMs })
  }
  for (const t of listTodoEntries(store, { status: 'pending' })) {
    if (!t.dueAt) continue
    const dueMs = new Date(t.dueAt).getTime()
    if (!Number.isFinite(dueMs) || dueMs < trackingStart || nowMs < dueMs) continue
    const key = `todo:${t.id}:${t.dueAt}`
    if (wasSent(store, key)) continue
    due.push({ key, kind: 'todo', title: t.title, atMs: dueMs })
  }
  return due.sort((a, b) => a.atMs - b.atMs)
}

function notificationFor(item) {
  return item.kind === 'schedule'
    ? { title: '日程提醒', body: item.title }
    : { title: '待办提醒', body: item.title }
}

export async function runReminderTick({ store, now, notify }) {
  const nowMs = now.getTime()
  let trackingStart = Number(getAppSetting(store, TRACKING_KEY))
  if (!Number.isFinite(trackingStart) || trackingStart <= 0) {
    trackingStart = nowMs
    setAppSetting(store, TRACKING_KEY, String(trackingStart))
  }

  const due = collectDue(store, nowMs, trackingStart)
  if (due.length === 0) return { delivered: 0 }

  const messages =
    due.length > MERGE_THRESHOLD
      ? [
          {
            items: due,
            payload: {
              title: `错过了 ${due.length} 条提醒`,
              body: due
                .slice(0, MERGED_TITLES_SHOWN)
                .map((item) => item.title)
                .join('、')
            }
          }
        ]
      : due.map((item) => ({ items: [item], payload: notificationFor(item) }))

  let delivered = 0
  for (const message of messages) {
    await notify(message.payload)
    for (const item of message.items) markSent(store, item.key, nowMs)
    store.persist()
    delivered += message.items.length
  }
  return { delivered }
}
