import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function read(file) {
  return fs.readFileSync(path.resolve(ROOT, file), 'utf8')
}

describe('renderer code style', () => {
  it('keeps the API client free of line comments', () => {
    const client = read('src/renderer/api/client.js')
    expect(client).not.toMatch(/^\s*\/\//m)
  })

  it('keeps the frontend suite in the full gate', () => {
    expect(read('scripts/run-tests.mjs')).toContain('test:frontend')
  })
})
