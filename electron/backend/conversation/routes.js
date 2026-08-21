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
  // BE-04：监听 req close → AbortController 下传，客户端断开即中止模型流；心跳保活；res.write 容错。
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

      const controller = new AbortController()
      let finished = false
      req.on('close', () => {
        if (!finished) controller.abort()
      })
      const heartbeat = setInterval(() => {
        if (!res.writableEnded) {
          try {
            res.write(': keep-alive\n\n')
          } catch {
            // 连接已关闭，忽略
          }
        }
      }, 15000)

      const safeWrite = (chunk) => {
        if (res.writableEnded) return
        try {
          res.write(chunk)
        } catch {
          // 客户端已断开，写入失败静默
        }
      }

      try {
        const result = await conversation.sendMessageStreamed(
          { date, message },
          (delta) => {
            safeWrite(`data: ${JSON.stringify({ kind: 'delta', text: delta })}\n\n`)
          },
          { signal: controller.signal }
        )
        safeWrite(`data: ${JSON.stringify({ kind: 'done', result })}\n\n`)
      } catch (error) {
        safeWrite(`data: ${JSON.stringify({ kind: 'error', error: String(error?.message || error) })}\n\n`)
      } finally {
        finished = true
        clearInterval(heartbeat)
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
