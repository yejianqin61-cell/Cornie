import { Router } from 'express'
import { createObservationService } from './service.js'

export function observationRoutes({ store }) {
  const router = Router()
  const observation = createObservationService(store)

  router.get('/observations', (req, res, next) => {
    try {
      const { date, from, to, type, limit } = req.query
      let result
      if (date) {
        result = observation.listByDate(date)
      } else {
        result = observation.listByRange({
          from: from || undefined,
          to: to || undefined,
          type: type || undefined,
          limit: limit ? Number(limit) : 50
        })
      }
      res.json({ observations: result })
    } catch (error) { next(error) }
  })

  router.get('/observations/:id', (req, res, next) => {
    try {
      const result = observation.get(req.params.id)
      if (!result) return res.status(404).json({ error: '找不到这条观察记录' })
      res.json({ observation: result })
    } catch (error) { next(error) }
  })

  router.post('/observations', (req, res, next) => {
    try {
      const result = observation.addNote({
        date: req.body.date,
        type: req.body.type || 'misc',
        title: req.body.title || '',
        content: req.body.content || '',
        relatedRef: req.body.relatedRef || null,
        sourceText: req.body.sourceText || null
      })
      res.status(201).json({ observation: result })
    } catch (error) { next(error) }
  })

  router.put('/observations/:id', (req, res, next) => {
    try {
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
    } catch (error) { next(error) }
  })

  router.delete('/observations/:id', (req, res, next) => {
    try {
      observation.deleteNote({ id: req.params.id })
      res.status(204).end()
    } catch (error) { next(error) }
  })

  return router
}
