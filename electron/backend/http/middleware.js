import { HttpError } from './errors.js'

export function jsonErrorHandler(err, _req, res, _next) {
  const status = err instanceof HttpError ? err.status : 500
  const payload = {
    error: err?.message || 'internal error'
  }
  if (err instanceof HttpError && err.details !== undefined) {
    payload.details = err.details
  }
  if (status >= 500) {
    // 避免把堆栈返回给前端；开发期可直接看控制台
    // eslint-disable-next-line no-console
    console.error(err)
  }
  res.status(status).json(payload)
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

