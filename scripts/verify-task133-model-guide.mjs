import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

async function main() {
  const appVue = await fs.readFile(path.join(repoRoot, 'src/renderer/App.vue'), 'utf8')

  assert.match(appVue, /guideOverlay/, 'App.vue should render a full-screen guide overlay')
  assert.match(appVue, /isGuideVisible/, 'App.vue should derive guide visibility from model configuration')
  assert.match(appVue, /saveModelSettings/, 'App.vue should persist model settings through api')
  assert.match(appVue, /clearModelSettings/, 'App.vue should allow clearing saved model settings')
  assert.match(appVue, /只要先把钥匙放好/, 'guide copy should explain the saved-key flow in user-friendly language')

  console.log('verify-task133-model-guide: passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
