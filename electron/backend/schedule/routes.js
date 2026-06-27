import { Router } from 'express'
import { asyncHandler } from '../http/middleware.js'
import { badRequest, HttpError } from '../http/errors.js'
import { requireString } from '../validators.js'

function optionalString(value, fieldName, { maxLen } = {}) {
  if (value === undefined || value === null || value === '') return undefined
  return requireString(String(value), fieldName, { maxLen })
}

function optionalInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed)) {
    throw badRequest(`invalid ${fieldName}`)
  }
  return parsed
}

function getRequiredSchedule(schedule, id) {
  const entry = schedule.get(id)
  if (!entry) {
    throw new HttpError(404, 'schedule entry not found')
  }
  return entry
}

function getRequiredCategory(schedule, id) {
  const category = schedule.getCategory(id)
  if (!category) {
    throw new HttpError(404, 'schedule category not found')
  }
  return category
}

export function scheduleRoutes({ schedule }) {
  const r = Router()

  r.get(
    '/schedules',
    asyncHandler(async (req, res) => {
      const view = optionalString(req.query.view, 'view', { maxLen: 32 })
      const from = optionalString(req.query.from, 'from', { maxLen: 64 })
      const to = optionalString(req.query.to, 'to', { maxLen: 64 })

      if (view === 'upcoming') {
        res.json({ items: schedule.listUpcoming() })
        return
      }
      if (view === 'cancelled') {
        res.json({ items: schedule.listCancelled() })
        return
      }
      if (view === 'today') {
        res.json({ items: schedule.listToday() })
        return
      }

      res.json({ items: schedule.listByRange({ from, to }) })
    })
  )

  r.get(
    '/schedules/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const entry = getRequiredSchedule(schedule, id)
      res.json({ entry })
    })
  )

  r.post(
    '/schedules',
    asyncHandler(async (req, res) => {
      const title = requireString(req.body?.title ?? '', 'title', { maxLen: 256 })
      const startAt = requireString(req.body?.startAt ?? req.body?.start_at ?? '', 'startAt', { maxLen: 128 })
      const entry = schedule.create({
        ...req.body,
        title,
        startAt
      })
      res.json({ entry })
    })
  )

  r.put(
    '/schedules/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const title = req.body?.title === undefined ? undefined : requireString(req.body.title, 'title', { maxLen: 256 })
      const startAt =
        req.body?.startAt === undefined && req.body?.start_at === undefined
          ? undefined
          : requireString(req.body?.startAt ?? req.body?.start_at ?? '', 'startAt', { maxLen: 128 })
      const entry = schedule.update({
        ...req.body,
        id,
        ...(title === undefined ? {} : { title }),
        ...(startAt === undefined ? {} : { startAt })
      })
      res.json({ entry })
    })
  )

  r.post(
    '/schedules/:id/cancel',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const entry = schedule.cancel({ id })
      res.json({ entry })
    })
  )

  r.post(
    '/schedules/:id/restore',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const entry = schedule.restore({ id })
      res.json({ entry })
    })
  )

  r.delete(
    '/schedules/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const entry = schedule.delete({ id })
      res.json({ entry })
    })
  )

  r.get(
    '/schedule-categories',
    asyncHandler(async (_req, res) => {
      res.json({ items: schedule.listCategories() })
    })
  )

  r.get(
    '/schedule-categories/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const category = getRequiredCategory(schedule, id)
      res.json({ category })
    })
  )

  r.post(
    '/schedule-categories',
    asyncHandler(async (req, res) => {
      const name = requireString(req.body?.name ?? '', 'name', { maxLen: 128 })
      const id = optionalString(req.body?.id, 'id', { maxLen: 128 })
      const sortOrder = optionalInteger(req.body?.sortOrder, 'sortOrder') ?? 0
      const category = schedule.createCategory({ name, id, sortOrder })
      res.json({ category })
    })
  )

  r.put(
    '/schedule-categories/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const existing = getRequiredCategory(schedule, id)
      const name = optionalString(req.body?.name, 'name', { maxLen: 128 }) ?? existing.name
      const isActive =
        req.body?.isActive === undefined || req.body?.isActive === null ? existing.isActive : Boolean(req.body.isActive)
      const sortOrder = optionalInteger(req.body?.sortOrder, 'sortOrder') ?? existing.sortOrder
      const category = schedule.updateCategory({ id, name, isActive, sortOrder })
      res.json({ category })
    })
  )

  r.post(
    '/schedule-categories/:id/restore',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const category = schedule.restoreCategory({ id })
      res.json({ category })
    })
  )

  r.post(
    '/schedule-categories/:id/reorder',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const sortOrder = optionalInteger(req.body?.sortOrder, 'sortOrder')
      if (sortOrder === undefined) {
        throw badRequest('invalid sortOrder')
      }
      const category = schedule.reorderCategory({ id, sortOrder })
      res.json({ category })
    })
  )

  return r
}
