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

  // 454：流式说话段（SSE）。最终回复逐块下发，tool_call 信封不流式。
  r.post(
    '/conversations/stream',
    asyncHandler(async (req, res) => {
      const message = requireString(req.body?.message ?? '', 'message', { maxLen: 5000 })
      const date = req.body?.date
        ? requireISODate(req.body.date)
        : new Date().toISOString().slice(0, 10)

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders?.()

      try {
        const result = await conversation.sendMessageStreamed({ date, message }, (delta) => {
          res.write(`data: ${JSON.stringify({ kind: 'delta', text: delta })}\n\n`)
        })
        res.write(`data: ${JSON.stringify({ kind: 'done', result })}\n\n`)
      } catch (error) {
        res.write(`data: ${JSON.stringify({ kind: 'error', error: String(error?.message || error) })}\n\n`)
      } finally {
        res.end()
      }
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
