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

function getRequiredTodo(todo, id) {
  const entry = todo.get(id)
  if (!entry) {
    throw new HttpError(404, 'todo entry not found')
  }
  return entry
}

function getRequiredCategory(todo, id) {
  const category = todo.getCategory(id)
  if (!category) {
    throw new HttpError(404, 'todo category not found')
  }
  return category
}

export function todoRoutes({ todo }) {
  const r = Router()

  r.get(
    '/todos',
    asyncHandler(async (req, res) => {
      const view = optionalString(req.query.view, 'view', { maxLen: 32 })
      const from = optionalString(req.query.from, 'from', { maxLen: 64 })
      const to = optionalString(req.query.to, 'to', { maxLen: 64 })

      if (view === 'open') {
        res.json({ items: todo.listOpen() })
        return
      }
      if (view === 'completed') {
        res.json({ items: todo.listCompleted() })
        return
      }
      if (view === 'today') {
        res.json({ items: todo.listToday() })
        return
      }

      res.json({ items: todo.listByRange({ from, to }) })
    })
  )

  r.get(
    '/todos/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const entry = getRequiredTodo(todo, id)
      res.json({ entry })
    })
  )

  r.post(
    '/todos',
    asyncHandler(async (req, res) => {
      const title = requireString(req.body?.title ?? '', 'title', { maxLen: 256 })
      const entry = todo.create({
        ...req.body,
        title
      })
      res.json({ entry })
    })
  )

  r.put(
    '/todos/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const title = req.body?.title === undefined ? undefined : requireString(req.body.title, 'title', { maxLen: 256 })
      const entry = todo.update({
        ...req.body,
        id,
        ...(title === undefined ? {} : { title })
      })
      res.json({ entry })
    })
  )

  r.post(
    '/todos/:id/complete',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const entry = todo.complete({ id })
      res.json({ entry })
    })
  )

  r.post(
    '/todos/:id/reopen',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const entry = todo.reopen({ id })
      res.json({ entry })
    })
  )

  r.delete(
    '/todos/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const entry = todo.delete({ id })
      res.json({ entry })
    })
  )

  r.get(
    '/todo-categories',
    asyncHandler(async (_req, res) => {
      res.json({ items: todo.listCategories() })
    })
  )

  r.get(
    '/todo-categories/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const category = getRequiredCategory(todo, id)
      res.json({ category })
    })
  )

  r.post(
    '/todo-categories',
    asyncHandler(async (req, res) => {
      const name = requireString(req.body?.name ?? '', 'name', { maxLen: 128 })
      const id = optionalString(req.body?.id, 'id', { maxLen: 128 })
      const sortOrder = optionalInteger(req.body?.sortOrder, 'sortOrder') ?? 0
      const category = todo.createCategory({ name, id, sortOrder })
      res.json({ category })
    })
  )

  r.put(
    '/todo-categories/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const existing = getRequiredCategory(todo, id)
      const name = optionalString(req.body?.name, 'name', { maxLen: 128 }) ?? existing.name
      const isActive =
        req.body?.isActive === undefined || req.body?.isActive === null ? existing.isActive : Boolean(req.body.isActive)
      const sortOrder = optionalInteger(req.body?.sortOrder, 'sortOrder') ?? existing.sortOrder
      const category = todo.updateCategory({ id, name, isActive, sortOrder })
      res.json({ category })
    })
  )

  r.post(
    '/todo-categories/:id/restore',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const category = todo.restoreCategory({ id })
      res.json({ category })
    })
  )

  r.post(
    '/todo-categories/:id/reorder',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const sortOrder = optionalInteger(req.body?.sortOrder, 'sortOrder')
      if (sortOrder === undefined) {
        throw badRequest('invalid sortOrder')
      }
      const category = todo.reorderCategory({ id, sortOrder })
      res.json({ category })
    })
  )

  return r
}
