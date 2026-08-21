export class HttpError extends Error {
  constructor(status, message, details, code) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details
    if (code !== undefined) this.code = code
  }
}

export function badRequest(message, details, code) {
  return new HttpError(400, message, details, code)
}
