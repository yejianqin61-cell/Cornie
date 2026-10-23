import assert from 'node:assert/strict'
import { applyPersistedModelSettingsToEnv, createSettingsService } from '../electron/backend/settings/service.js'
import { getAppSetting, setAppSetting } from '../electron/db.js'
import { createServiceHarness } from '../tests/shared/service-harness.mjs'

const rawKey = 'phase5-secret-key'

function createFakeSecretStore() {
  return {
    encrypt(value) {
      return `safeStorage:v1:${Buffer.from(value, 'utf8').toString('base64')}`
    },
    decrypt(value) {
      return Buffer.from(String(value).replace(/^safeStorage:v1:/, ''), 'base64').toString('utf8')
    }
  }
}

async function main() {
  const harness = await createServiceHarness('phase5-secure-settings')
  try {
    const secure = createFakeSecretStore()
    const service = createSettingsService(harness.store, { secretStore: secure })
    const saved = service.saveModelSettings({ apiKey: rawKey, model: 'phase5-model' })
    const stored = getAppSetting(harness.store, 'settings.model.deepseek.apiKey')
    assert.notEqual(stored, rawKey)
    assert.match(stored, /^safeStorage:v1:/)
    assert.equal(saved.hasApiKey, true)
    assert.notEqual(saved.maskedApiKey, rawKey)

    const reloaded = createSettingsService(harness.store, { secretStore: secure }).getModelSettings()
    assert.equal(reloaded.hasApiKey, true)

    assert.throws(
      () => createSettingsService(harness.store).saveModelSettings({ apiKey: 'must-fail' }),
      /secure|secret|safeStorage/i
    )

    setAppSetting(harness.store, 'settings.model.deepseek.apiKey', rawKey)
    applyPersistedModelSettingsToEnv(harness.store, { secretStore: secure })
    const migrated = getAppSetting(harness.store, 'settings.model.deepseek.apiKey')
    assert.match(migrated, /^safeStorage:v1:/)
    assert.notEqual(migrated, rawKey)
    console.log('verify-phase5-secure-settings: passed')
  } finally {
    await harness.close()
  }
}

main().catch((error) => {
  console.error('verify-phase5-secure-settings: failed')
  console.error(error?.stack ?? error)
  process.exitCode = 1
})
