import { badRequest } from './http/errors.js'

export function requireISODate(value, fieldName = 'date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest(`invalid ${fieldName}`)
  }
  return value
}

export function optionalISOMonth(value, fieldName = 'month') {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) {
    throw badRequest(`invalid ${fieldName}`)
  }
  return value
}

export function requireString(value, fieldName, { maxLen } = {}) {
  if (typeof value !== 'string') throw badRequest(`invalid ${fieldName}`)
  if (maxLen && value.length > maxLen) throw badRequest(`${fieldName} too long`, { maxLen })
  return value
}

