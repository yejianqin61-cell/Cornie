import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

async function main() {
  const appVue = await fs.readFile(path.join(repoRoot, 'src/renderer/App.vue'), 'utf8')

  assert.match(appVue, /联网和隐私要知道什么/, 'guide should include network and privacy explanation')
  assert.match(appVue, /如果还是连不上，可以先这样试试/, 'guide should include recovery tips')
  assert.match(appVue, /toFriendlySettingsError/, 'guide should translate backend errors into user-facing copy')
  assert.match(appVue, /settingsError\.value = toFriendlySettingsError\(error\)/, 'guide flow should avoid raw backend errors')

  console.log('verify-task134-model-copy: passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
