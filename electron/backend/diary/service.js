import { getEntry, listEntries, setCornieText, upsertUserText } from '../../db.js'

export function diaryService(store) {
  return {
    listEntries: ({ month }) => listEntries(store, { month }),
    getEntry: (date) => getEntry(store, date),
    upsertUserText: ({ date, userText }) => upsertUserText(store, { date, userText }),
    regenerateCornie: ({ date }) => {
      const placeholder =
        '今天我也在角落里陪着你。等你愿意说点什么，或者写点什么，我就能把这一天好好记下来。'
      return setCornieText(store, { date, cornieText: placeholder })
    }
  }
}

