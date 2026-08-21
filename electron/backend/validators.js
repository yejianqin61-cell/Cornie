import { badRequest } from './http/errors.js'

// BE-03：日期真实性校验——拒绝 2026-99-99 / 2026-02-30 等被 Date 滚动接受的输入。
function isRealCalendarDate(y, m, d) {
  const date = new Date(y, m - 1, d, 0, 0, 0, 0)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

export function requireISODate(value, fieldName = 'date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest(`invalid ${fieldName}`)
  }
  const [y, m, d] = value.split('-').map(Number)
  if (!isRealCalendarDate(y, m, d)) {
    throw badRequest(`invalid ${fieldName}`)
  }
  return value
}

export function optionalISOMonth(value, fieldName = 'month') {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) {
    throw badRequest(`invalid ${fieldName}`)
  }
  const [, m] = value.split('-').map(Number)
  if (m < 1 || m > 12) {
    throw badRequest(`invalid ${fieldName}`)
  }
  return value
}

export function requireString(value, fieldName, { maxLen } = {}) {
  if (typeof value !== 'string') throw badRequest(`invalid ${fieldName}`)
  if (maxLen && value.length > maxLen) throw badRequest(`${fieldName} too long`, { maxLen })
  return value
}

