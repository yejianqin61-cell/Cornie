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

describe('shell honesty', () => {
  it('drops the window buttons that have no IPC target', () => {
    const topBar = read('src/renderer/components/layout/CornieTopBar.vue')
    expect(topBar).toContain('CORNIE')
    expect(topBar).not.toContain('nb-topbar-controls')
    expect(topBar).not.toContain('Minimize')
  })

  it('drops the hardcoded memory and observation counts', () => {
    const app = read('src/renderer/App.vue')
    expect(app).not.toContain('记忆 12')
    expect(app).not.toContain('观察 3')
    expect(app).toContain('v0.1.0')
  })
})

describe('chat rendering', () => {
  it('memoises persisted message rows', () => {
    const page = read('src/renderer/components/chat/ChatHistoryPage.vue')
    expect(page).toContain('v-memo')
  })
})
