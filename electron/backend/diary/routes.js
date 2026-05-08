import { Router } from 'express'
import { asyncHandler } from '../http/middleware.js'
import { optionalISOMonth, requireISODate, requireString } from '../validators.js'

export function diaryRoutes({ diary }) {
  const r = Router()

  r.get(
    '/entries',
    asyncHandler(async (req, res) => {
      const month = optionalISOMonth(req.query.month)
      const entries = diary.listEntries({ month })
      res.json({ entries })
    })
  )

  r.get(
    '/entries/:date',
    asyncHandler(async (req, res) => {
      const date = requireISODate(req.params.date)
      res.json({ entry: diary.getEntry(date) })
    })
  )

  r.put(
    '/entries/:date',
    asyncHandler(async (req, res) => {
      const date = requireISODate(req.params.date)
      const userText = requireString(req.body?.userText ?? '', 'userText', { maxLen: 50_000 })
      res.json({ entry: diary.upsertUserText({ date, userText }) })
    })
  )

  r.post(
    '/entries/:date/regenerate-cornie',
    asyncHandler(async (req, res) => {
      const date = requireISODate(req.params.date)
      res.json({ entry: diary.regenerateCornie({ date }) })
    })
  )

  return r
}

