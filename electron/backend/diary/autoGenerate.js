import { getAppSetting, getEntry, listConversationDates } from '../../db.js'

export const DIARY_AUTO_KEY = 'settings.diary.autoGenerate'
const DAY_MS = 24 * 60 * 60 * 1000

export function isDiaryAutoEnabled(store) {
  return getAppSetting(store, DIARY_AUTO_KEY) === 'true'
}

function daysBetween(fromDate, toDate) {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / DAY_MS)
}

export async function runAutoDiary({ store, today, generate, maxDays = 7, maxPerRun = 3 }) {
  if (!isDiaryAutoEnabled(store)) return { generated: [], skipped: 'disabled' }

  const missing = listConversationDates(store)
    .map((row) => row.date)
    .filter((date) => {
      const age = daysBetween(date, today)
      return age >= 1 && age <= maxDays
    })
    .filter((date) => !getEntry(store, date).cornieText.trim())
    .sort()
    .slice(0, maxPerRun)

  const generated = []
  for (const date of missing) {
    try {
      await generate({ date })
      generated.push(date)
    } catch (error) {
      return { generated, error: error?.message ?? String(error) }
    }
  }
  return { generated }
}
