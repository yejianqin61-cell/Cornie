import { getEntry, listEntries, listOnThisDay, setCornieText, upsertUserText } from '../../db.js'
import { generateCornieDiary } from './generator.js'

export function diaryService(store) {
  const svc = {
    listEntries: ({ month }) => listEntries(store, { month }),
    getEntry: (date) => getEntry(store, date),
    upsertUserText: ({ date, userText, cornieText }) => upsertUserText(store, { date, userText, cornieText }),
    listOnThisDay: ({ date, limit }) => listOnThisDay(store, { date, limit }),

    generateCornie: async ({ date }) => {
      const diary = await generateCornieDiary(store, {
        date,
        memorySummary: '（长期记忆摘要暂未接入，先保留空位）'
      })

      return setCornieText(store, { date, cornieText: diary })
    },

    regenerateCornie: ({ date }) => svc.generateCornie({ date })
  }
  return svc
}
