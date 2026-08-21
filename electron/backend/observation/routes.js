import { Router } from 'express'
import { createObservationService } from './service.js'
import { asyncHandler } from '../http/middleware.js'
import { badRequest } from '../http/errors.js'
import { requireISODate } from '../validators.js'

// BE-08：observation 路由统一 asyncHandler 风格，并补齐日期/limit 参数校验（原手写 try/catch+next）。

function parseOptionalDate(value, fieldName) {
  if (value === undefined) return undefined
  return requireISODate(String(value), fieldName)
}

function parseOptionalLimit(value, fallback) {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw badRequest('invalid limit', undefined, 'invalid_limit')
  }
  return parsed
}

export function observationRoutes({ store }) {
  const router = Router()
  const observation = createObservationService(store)

  router.get(
    '/observations',
    asyncHandler((req, res) => {
      const { type, q, limit } = req.query
      const date = parseOptionalDate(req.query.date, 'date')
      const from = parseOptionalDate(req.query.from, 'from')
      const to = parseOptionalDate(req.query.to, 'to')
      const parsedLimit = parseOptionalLimit(limit, undefined)
      let result
      if (date) {
        result = observation.listByRange({
          from: date,
          to: date,
          type: type || undefined,
          q: q || undefined,
          limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined
        })
      } else {
        result = observation.listByRange({
          from: from || undefined,
          to: to || undefined,
          type: type || undefined,
          q: q || undefined,
          limit: Number.isFinite(parsedLimit)
            ? parsedLimit
            : observation.getPromptPolicy().historyListDefaultLimit
        })
      }
      res.json({
        observations: result,
        policy: observation.getPromptPolicy(),
        policySummary: observation.getPromptPolicySummary()
      })
    })
  )

  router.get(
    '/observations/recall',
    asyncHandler((req, res) => {
      const { type, q, topic, person } = req.query
      const date = parseOptionalDate(req.query.date, 'date')
      const from = parseOptionalDate(req.query.from, 'from')
      const to = parseOptionalDate(req.query.to, 'to')
      const limit = parseOptionalLimit(req.query.limit, 50)
      const result = observation.listByRecall({
        date: date || undefined,
        from: from || undefined,
        to: to || undefined,
        type: type || undefined,
        q: q || undefined,
        topic: topic || undefined,
        person: person || undefined,
        limit
      })
      res.json({
        observations: result,
        recall: {
          date: date || '',
          from: from || '',
          to: to || '',
          type: type || '',
          q: q || '',
          topic: topic || '',
          person: person || ''
        },
        policy: observation.getPromptPolicy(),
        policySummary: observation.getPromptPolicySummary()
      })
    })
  )

  router.get(
    '/observations/:id',
    asyncHandler((req, res) => {
      const result = observation.get(req.params.id)
      if (!result) return res.status(404).json({ error: '找不到这条观察记录' })
      res.json({ observation: result })
    })
  )

  router.post(
    '/observations',
    asyncHandler((req, res) => {
      const result = observation.addNote({
        date: req.body.date,
        type: req.body.type || 'misc',
        title: req.body.title || '',
        content: req.body.content || '',
        relatedRef: req.body.relatedRef || null,
        sourceText: req.body.sourceText || null
      })
      res.status(201).json({ observation: result })
    })
  )

  router.put(
    '/observations/:id',
    asyncHandler((req, res) => {
      const result = observation.updateNote({
        id: req.params.id,
        date: req.body.date,
        type: req.body.type,
        title: req.body.title,
        content: req.body.content,
        relatedRef: req.body.relatedRef,
        sourceText: req.body.sourceText
      })
      if (!result) return res.status(404).json({ error: '找不到这条观察记录' })
      res.json({ observation: result })
    })
  )

  router.delete(
    '/observations/:id',
    asyncHandler((req, res) => {
      observation.deleteNote({ id: req.params.id })
      res.status(204).end()
    })
  )

  return router
}
