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
      const limit = req.query.limit === undefined ? undefined : Number.parseInt(String(req.query.limit), 10)
      const cursor = req.query.cursor === undefined ? undefined : Number.parseInt(String(req.query.cursor), 10)
      res.json(chatlog.getByDate(date, { limit, cursor }))
    })
  )

  return r
}
