import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(file) {
  return fs.readFileSync(path.resolve(process.cwd(), file), 'utf8')
}

describe('design tokens', () => {
  it('defines every token the renderer references', () => {
    const css = read('src/renderer/styles/main.css')
    const tokens = [
      '--nb-border',
      '--nb-border-width',
      '--nb-radius',
      '--nb-shadow',
      '--nb-background',
      '--nb-text',
      '--nb-accent',
      '--nb-hover',
      '--nb-text-secondary',
      '--nb-danger',
    ]
    for (const token of tokens) {
      expect(css, `${token} is not defined`).toMatch(new RegExp(`${token}\\s*:\\s*[^;\\s]`))
    }
  })

  it('keeps the chat surface on tokens instead of ad hoc colors', () => {
    const panel = read('src/renderer/components/chat/ChatPanel.vue')
    expect(panel).not.toContain('#f0f0f0')
    expect(panel).toContain('var(--nb-background)')

    expect(read('src/renderer/components/chat/ChatDateNav.vue')).toContain('var(--nb-border)')
    expect(read('src/renderer/components/chat/MessageRow.vue')).toContain('var(--nb-accent)')
  })
})
