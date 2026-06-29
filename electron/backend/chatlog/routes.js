import { Router } from 'express'
import { asyncHandler } from '../http/middleware.js'
import { optionalISOMonth, requireISODate, requireString } from '../validators.js'

export function chatlogRoutes({ chatlog }) {
  const r = Router()

  r.get(
    '/chatlogs',
    asyncHandler(async (req, res) => {
      const month = optionalISOMonth(req.query.month)
      const query = req.query.q === undefined
        ? undefined
        : requireString(String(req.query.q), 'q', { maxLen: 200 })
      const limit = req.query.limit === undefined ? undefined : Number.parseInt(String(req.query.limit), 10)
      const cursor = req.query.cursor === undefined ? undefined : Number.parseInt(String(req.query.cursor), 10)
      res.json(chatlog.listDates({ month, query, limit, cursor }))
    })
  )

  r.get(
    '/chatlogs/:date',
    asyncHandler(async (req, res) => {
      const date = requireISODate(req.params.date)
      const query = req.query.q === undefined
        ? undefined
        : requireString(String(req.query.q), 'q', { maxLen: 200 })
      const limit = req.query.limit === undefined ? undefined : Number.parseInt(String(req.query.limit), 10)
      const cursor = req.query.cursor === undefined ? undefined : Number.parseInt(String(req.query.cursor), 10)
      const result = chatlog.getByDate(date, { limit, cursor, query })
      res.json({
        ...result,
        meta: {
          responseType: 'chatlog_day_record',
          storage: result.storage
        }
      })
    })
  )

  r.get(
    '/chatlogs/:date/export',
    asyncHandler(async (req, res) => {
      const date = requireISODate(req.params.date)
      const format = req.query.format === undefined
        ? 'json'
        : requireString(String(req.query.format), 'format', { maxLen: 16 })
      res.json(chatlog.exportByDate(date, { format }))
    })
  )

  r.get(
    '/chatlogs/export/month/:month',
    asyncHandler(async (req, res) => {
      const month = optionalISOMonth(req.params.month)
      const format = req.query.format === undefined
        ? 'json'
        : requireString(String(req.query.format), 'format', { maxLen: 16 })
      res.json(chatlog.exportByMonth(month, { format }))
    })
  )

  return r
}
