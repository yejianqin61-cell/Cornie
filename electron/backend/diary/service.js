import { getEntry, listEntries, listOnThisDay, setCornieText, upsertUserText } from '../../db.js'
import { generateCornieDiary } from './generator.js'
import { buildWikiContext } from '../agent/wikiContext.js'

export function diaryService(store) {
  const svc = {
    listEntries: ({ month }) => listEntries(store, { month }),
    getEntry: (date) => getEntry(store, date),
    upsertUserText: ({ date, userText, cornieText }) => upsertUserText(store, { date, userText, cornieText }),
    listOnThisDay: ({ date, limit }) => listOnThisDay(store, { date, limit }),

    generateCornie: async ({ date }, options = {}) => {
      // BE-06：无日记条目的日期不抛 TypeError——userText 缺失按空串处理。
      const existing = getEntry(store, date)
      const wikiContext = await buildWikiContext(store, {
        date,
        baseDir: process.cwd(),
        query: existing?.userText ?? ''
      })
      const diary = await generateCornieDiary(store, {
        date,
        memorySummary: wikiContext.memorySummary
      }, options)

      return setCornieText(store, { date, cornieText: diary })
    },

    regenerateCornie: ({ date }) => svc.generateCornie({ date })
  }
  return svc
}
