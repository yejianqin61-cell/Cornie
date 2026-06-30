import { Router } from 'express'
import { asyncHandler } from '../http/middleware.js'
import { optionalISOMonth, requireISODate, requireString } from '../validators.js'

export function chatlogRoutes({ chatlog }) {
  const r = Router()

  r.get(
    '/chatlogs',
    asyncHandler(async (req, res) => {
      const month = optionalISOMonth(req.query.month)
      const scope = req.query.scope === undefined
        ? undefined
        : requireString(String(req.query.scope), 'scope', { maxLen: 32 })
      const query = req.query.q === undefined
        ? undefined
        : requireString(String(req.query.q), 'q', { maxLen: 200 })
      const limit = req.query.limit === undefined ? undefined : Number.parseInt(String(req.query.limit), 10)
      const cursor = req.query.cursor === undefined ? undefined : Number.parseInt(String(req.query.cursor), 10)
      const result = chatlog.listDates({ month, scope, query, limit, cursor })
      res.json({
        ...result,
        meta: {
          responseType: 'chatlog_history_list',
          storage: result.storage
        }
      })
    })
  )

  r.get(
    '/chatlogs/search/snippets',
    asyncHandler(async (req, res) => {
      const keyword = requireString(String(req.query.keyword ?? req.query.q ?? ''), 'keyword', { maxLen: 200 })
      const month = req.query.month === undefined ? undefined : optionalISOMonth(req.query.month)
      const scope = req.query.scope === undefined
        ? undefined
        : requireString(String(req.query.scope), 'scope', { maxLen: 32 })
      const limit = req.query.limit === undefined ? undefined : Number.parseInt(String(req.query.limit), 10)
      const cursor = req.query.cursor === undefined ? undefined : Number.parseInt(String(req.query.cursor), 10)
      const result = chatlog.searchMessageSnippets(keyword, { month, scope, limit, cursor })
      res.json({
        ...result,
        meta: {
          responseType: 'chatlog_message_snippet_search',
          storage: result.storage
        }
      })
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
      const beforeId = req.query.beforeId === undefined
        ? undefined
        : requireString(String(req.query.beforeId), 'beforeId', { maxLen: 128 })
      const mode = req.query.mode === undefined
        ? 'legacy'
        : requireString(String(req.query.mode), 'mode', { maxLen: 32 })
      const result = mode === 'page'
        ? chatlog.getDayPage(date, { limit, cursor, query, beforeId })
        : chatlog.getByDate(date, { limit, cursor, query })
      res.json({
        ...result,
        meta: {
          responseType: mode === 'page' ? 'chatlog_day_page' : 'chatlog_day_record',
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
      const result = chatlog.exportByDate(date, { format })
      res.json({
        ...result,
        meta: {
          ...(result.meta || {}),
          responseType: 'chatlog_day_export',
          storage: result.meta?.storage || null
        }
      })
    })
  )

  r.get(
    '/chatlogs/export/month/:month',
    asyncHandler(async (req, res) => {
      const month = optionalISOMonth(req.params.month)
      const format = req.query.format === undefined
        ? 'json'
        : requireString(String(req.query.format), 'format', { maxLen: 16 })
      const result = chatlog.exportByMonth(month, { format })
      res.json({
        ...result,
        meta: {
          ...(result.meta || {}),
          responseType: 'chatlog_month_export',
          storage: result.meta?.storage || null
        }
      })
    })
  )

  return r
}
