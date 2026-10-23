import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

describe('chat dead code', () => {
  it('removes the unused chat display components', () => {
    for (const name of ['MemoryHint.vue', 'ChatDaySummary.vue', 'AskBackBubble.vue', 'ChatEmptyState.vue']) {
      expect(fs.existsSync(path.join(ROOT, 'src/renderer/components/chat', name)), name).toBe(false)
    }
  })
})
