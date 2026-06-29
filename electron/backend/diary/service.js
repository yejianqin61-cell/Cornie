import { getEntry, listEntries, listOnThisDay, setCornieText, upsertUserText } from '../../db.js'
import { generateCornieDiary } from './generator.js'
import { buildWikiContext } from '../agent/wikiContext.js'

export function diaryService(store) {
  const svc = {
    listEntries: ({ month }) => listEntries(store, { month }),
    getEntry: (date) => getEntry(store, date),
    upsertUserText: ({ date, userText, cornieText }) => upsertUserText(store, { date, userText, cornieText }),
    listOnThisDay: ({ date, limit }) => listOnThisDay(store, { date, limit }),

    generateCornie: async ({ date }) => {
      const wikiContext = await buildWikiContext(store, {
        date,
        baseDir: process.cwd(),
        query: getEntry(store, date).userText
      })
      const diary = await generateCornieDiary(store, {
        date,
        memorySummary: wikiContext.memorySummary
      })

      return setCornieText(store, { date, cornieText: diary })
    },

    regenerateCornie: ({ date }) => svc.generateCornie({ date })
  }
  return svc
}
