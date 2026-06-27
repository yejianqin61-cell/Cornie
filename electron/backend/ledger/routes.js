import { Router } from 'express'
import { asyncHandler } from '../http/middleware.js'
import { badRequest, HttpError } from '../http/errors.js'
import { requireString } from '../validators.js'

function optionalNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw badRequest(`invalid ${fieldName}`)
  }
  return parsed
}

function optionalInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed)) {
    throw badRequest(`invalid ${fieldName}`)
  }
  return parsed
}

function optionalString(value, fieldName, { maxLen } = {}) {
  if (value === undefined || value === null || value === '') return undefined
  return requireString(String(value), fieldName, { maxLen })
}

function getRequiredEntry(id, getter, resourceName) {
  const entry = getter(id)
  if (!entry) {
    throw new HttpError(404, `${resourceName} not found`)
  }
  return entry
}

export function ledgerRoutes({ ledger }) {
  const r = Router()

  r.get(
    '/ledger/entries',
    asyncHandler(async (req, res) => {
      const categoryId = optionalString(req.query.categoryId, 'categoryId', { maxLen: 128 })
      const categoryName = optionalString(req.query.categoryName, 'categoryName', { maxLen: 128 })
      const type = optionalString(req.query.type, 'type', { maxLen: 32 })
      const from = optionalString(req.query.from, 'from', { maxLen: 64 })
      const to = optionalString(req.query.to, 'to', { maxLen: 64 })
      const recent = optionalInteger(req.query.recent, 'recent')
      const ids = typeof req.query.ids === 'string' && req.query.ids.trim()
        ? req.query.ids.split(',').map((item) => item.trim()).filter(Boolean)
        : undefined

      if (ids?.length) {
        res.json({ items: ledger.listByIdBatch({ ids }) })
        return
      }

      if (recent !== undefined) {
        res.json({ items: ledger.listRecent({ limit: recent, type }) })
        return
      }

      if (categoryId || categoryName) {
        res.json({ items: ledger.listByCategory({ categoryId, categoryName, type, from, to }) })
        return
      }

      res.json({ items: ledger.listByRange({ from, to, type }) })
    })
  )

  r.get(
    '/ledger/entries/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const entry = getRequiredEntry(id, ledger.getEntry, 'ledger entry')
      res.json({ entry })
    })
  )

  r.post(
    '/ledger/entries/expense',
    asyncHandler(async (req, res) => {
      const amount = optionalNumber(req.body?.amount, 'amount')
      const entry = ledger.addExpense({
        ...req.body,
        amount
      })
      res.json({ entry })
    })
  )

  r.post(
    '/ledger/entries/income',
    asyncHandler(async (req, res) => {
      const amount = optionalNumber(req.body?.amount, 'amount')
      const entry = ledger.addIncome({
        ...req.body,
        amount
      })
      res.json({ entry })
    })
  )

  r.put(
    '/ledger/entries/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const amount = optionalNumber(req.body?.amount, 'amount')
      const entry = ledger.updateEntry({
        ...req.body,
        id,
        amount
      })
      res.json({ entry })
    })
  )

  r.delete(
    '/ledger/entries/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const entry = ledger.deleteEntry({ id })
      res.json({ entry })
    })
  )

  r.get(
    '/ledger/categories',
    asyncHandler(async (req, res) => {
      const type = optionalString(req.query.type, 'type', { maxLen: 32 })
      if (type === 'expense') {
        res.json({ items: ledger.listExpenseCategories() })
        return
      }
      if (type === 'income') {
        res.json({ items: ledger.listIncomeCategories() })
        return
      }
      res.json({ items: ledger.listAllCategories() })
    })
  )

  r.get(
    '/ledger/categories/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const category = ledger.getCategory(id)
      if (!category) {
        throw new HttpError(404, 'ledger category not found')
      }
      res.json({ category })
    })
  )

  r.post(
    '/ledger/categories/expense',
    asyncHandler(async (req, res) => {
      const name = requireString(req.body?.name ?? '', 'name', { maxLen: 128 })
      const id = optionalString(req.body?.id, 'id', { maxLen: 128 })
      const sortOrder = optionalInteger(req.body?.sortOrder, 'sortOrder') ?? 0
      const category = ledger.createExpenseCategory({ name, id, sortOrder })
      res.json({ category })
    })
  )

  r.post(
    '/ledger/categories/income',
    asyncHandler(async (req, res) => {
      const name = requireString(req.body?.name ?? '', 'name', { maxLen: 128 })
      const id = optionalString(req.body?.id, 'id', { maxLen: 128 })
      const sortOrder = optionalInteger(req.body?.sortOrder, 'sortOrder') ?? 0
      const category = ledger.createIncomeCategory({ name, id, sortOrder })
      res.json({ category })
    })
  )

  r.put(
    '/ledger/categories/:id',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const existing = ledger.getCategory(id)
      if (!existing) {
        throw new HttpError(404, 'ledger category not found')
      }

      const type = optionalString(req.body?.type, 'type', { maxLen: 32 }) ?? existing.type
      const name = optionalString(req.body?.name, 'name', { maxLen: 128 }) ?? existing.name
      const isActive =
        req.body?.isActive === undefined || req.body?.isActive === null ? existing.isActive : Boolean(req.body.isActive)
      const sortOrder = optionalInteger(req.body?.sortOrder, 'sortOrder') ?? existing.sortOrder

      const category = ledger.updateCategory({ id, type, name, isActive, sortOrder })
      res.json({ category })
    })
  )

  r.post(
    '/ledger/categories/:id/restore',
    asyncHandler(async (req, res) => {
      const id = requireString(req.params.id, 'id', { maxLen: 128 })
      const category = ledger.restoreCategory({ id })
      res.json({ category })
    })
  )

  return r
}
