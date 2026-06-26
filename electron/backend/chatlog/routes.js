import { Router } from 'express'
import { asyncHandler } from '../http/middleware.js'
import { optionalISOMonth, requireISODate } from '../validators.js'

export function chatlogRoutes({ chatlog }) {
  const r = Router()

  r.get(
    '/chatlogs',
    asyncHandler(async (req, res) => {
      const month = optionalISOMonth(req.query.month)
      res.json(chatlog.listDates({ month }))
    })
  )

  r.get(
    '/chatlogs/:date',
    asyncHandler(async (req, res) => {
      const date = requireISODate(req.params.date)
      res.json(chatlog.getByDate(date))
    })
  )

  return r
}
