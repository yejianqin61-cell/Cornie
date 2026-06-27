import { Router } from 'express'
import { asyncHandler } from '../http/middleware.js'

export function settingsRoutes({ settings }) {
  const r = Router()

  r.get(
    '/settings/model',
    asyncHandler(async (_req, res) => {
      res.json({ settings: settings.getModelSettings() })
    })
  )

  r.put(
    '/settings/model',
    asyncHandler(async (req, res) => {
      res.json({ settings: settings.saveModelSettings(req.body ?? {}) })
    })
  )

  r.delete(
    '/settings/model',
    asyncHandler(async (_req, res) => {
      res.json({ settings: settings.clearModelSettings() })
    })
  )

  return r
}
