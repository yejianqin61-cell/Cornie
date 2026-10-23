import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

function read(file) {
  return fs.readFileSync(path.resolve(ROOT, file), 'utf8')
}

describe('CornieLayout', () => {
  it('exposes the main content as a main landmark', () => {
    const layout = read('src/renderer/components/layout/CornieLayout.vue')
    expect(layout).toContain('<main class="nb-layout-main">')
    expect(layout).toContain('</main>')
  })
})
