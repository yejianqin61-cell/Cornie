import { Router } from 'express'
import { asyncHandler } from '../http/middleware.js'
import { requireISODate, requireString } from '../validators.js'

export function conversationRoutes({ conversation }) {
  const r = Router()

  r.post(
    '/conversations',
    asyncHandler(async (req, res) => {
      const message = requireString(req.body?.message ?? '', 'message', { maxLen: 5000 })
      const date = req.body?.date
        ? requireISODate(req.body.date)
        : new Date().toISOString().slice(0, 10)

      const result = await conversation.sendMessage({ date, message })
      res.json(result)
    })
  )

  r.get(
    '/conversations/:date',
    asyncHandler(async (req, res) => {
      const date = requireISODate(req.params.date)
      const messages = conversation.getConversation(date)
      res.json({ date, messages })
    })
  )

  r.delete(
    '/conversations/:date',
    asyncHandler(async (req, res) => {
      const date = requireISODate(req.params.date)
      conversation.deleteConversation(date)
      res.status(204).end()
    })
  )

  return r
}
