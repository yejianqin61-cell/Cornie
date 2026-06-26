import { Router } from 'express'
import { asyncHandler } from '../http/middleware.js'
import { badRequest, HttpError } from '../http/errors.js'
import { requireISODate } from '../validators.js'

function requireDecision(value) {
  if (value === 'approve' || value === 'reject') {
    return value
  }
  throw badRequest('invalid decision')
}

export function confirmRoutes({ confirm }) {
  const r = Router()

  r.get(
    '/confirmations',
    asyncHandler(async (req, res) => {
      const date = req.query?.date ? requireISODate(String(req.query.date)) : undefined
      const status = req.query?.status ? String(req.query.status) : undefined
      res.json({
        confirmations: confirm.listByDate({ date, status })
      })
    })
  )

  r.get(
    '/confirmations/:id',
    asyncHandler(async (req, res) => {
      const confirmation = confirm.get(String(req.params.id))
      if (!confirmation) {
        throw new HttpError(404, 'confirmation not found')
      }
      res.json({ confirmation })
    })
  )

  r.post(
    '/confirmations/:id/decision',
    asyncHandler(async (req, res) => {
      const id = String(req.params.id)
      const decision = requireDecision(req.body?.decision)

      if (decision === 'approve') {
        confirm.approve(id)
        const result = await confirm.executeApprovedConfirmation(id)
        res.json(result)
        return
      }

      const result = confirm.rejectConfirmation(id)
      res.json(result)
    })
  )

  return r
}
