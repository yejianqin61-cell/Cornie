import { runAutoDiary } from '../../electron/backend/diary/autoGenerate.js'
import { createServer } from '../../electron/server.js'
import { clearTools } from '../../electron/backend/tools/registry.js'
import { saveMessage, setAppSetting, setCornieText, upsertUserText } from '../../electron/db.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const KEY = 'settings.diary.autoGenerate'
const TODAY = '2026-09-16'

async function withServer(harness, run) {
  clearTools()
  const app = await createServer({ store: harness.store, baseDir: harness.baseDir })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  try {
    await run(`http://127.0.0.1:${server.address().port}/api`)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

function chat(store, date) {
  saveMessage(store, { id: `m-${date}`, date, role: 'user', content: `你好 ${date}` })
}

async function withStore(run) {
  const harness = await createServiceHarness('diary-auto')
  try {
    await run(harness.store)
  } finally {
    await harness.close()
  }
}

// cases 1, 2
{
  const harness = await createServiceHarness('diary-auto-http')
  try {
    await withServer(harness, async (base) => {
      const get = async () => (await (await fetch(`${base}/settings/diary-auto`)).json()).settings.enabled
      assert((await get()) === false, 'case 1: default is off')
      const put = await fetch(`${base}/settings/diary-auto`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ enabled: true })
      })
      assert(put.ok, 'case 1: put ok')
      assert((await get()) === true, 'case 1: now on')
      const bad = await fetch(`${base}/settings/diary-auto`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ enabled: 'yes' })
      })
      assert(bad.status === 400, 'case 2: non-boolean rejected', bad.status)
    })
  } finally {
    await harness.close()
  }
}

await withStore(async (store) => {
  chat(store, '2026-09-15')
  const calls = []
  const r = await runAutoDiary({ store, today: TODAY, generate: async (a) => void calls.push(a.date) })
  assert(calls.length === 0 && r.skipped === 'disabled', 'case 3: disabled does nothing', r)
})

await withStore(async (store) => {
  setAppSetting(store, KEY, 'true')
  chat(store, '2026-09-15')
  chat(store, '2026-09-14')
  setCornieText(store, { date: '2026-09-14', cornieText: '已有日记' })
  chat(store, TODAY)
  const calls = []
  await runAutoDiary({ store, today: TODAY, generate: async (a) => void calls.push(a.date) })
  assert(calls.length === 1 && calls[0] === '2026-09-15', 'case 4: only yesterday', calls)
})

await withStore(async (store) => {
  setAppSetting(store, KEY, 'true')
  chat(store, '2026-09-08')
  const calls = []
  await runAutoDiary({ store, today: TODAY, generate: async (a) => void calls.push(a.date) })
  assert(calls.length === 0, 'case 5: 8 days old is skipped', calls)
})

await withStore(async (store) => {
  setAppSetting(store, KEY, 'true')
  for (const d of ['09-10', '09-11', '09-12', '09-13', '09-14']) chat(store, `2026-${d}`)
  const calls = []
  const r = await runAutoDiary({ store, today: TODAY, generate: async (a) => void calls.push(a.date) })
  assert(
    JSON.stringify(calls) === JSON.stringify(['2026-09-10', '2026-09-11', '2026-09-12']) && r.generated.length === 3,
    'case 6: earliest three',
    calls
  )
})

await withStore(async (store) => {
  setAppSetting(store, KEY, 'true')
  for (const d of ['09-13', '09-14', '09-15']) chat(store, `2026-${d}`)
  const calls = []
  const r = await runAutoDiary({
    store,
    today: TODAY,
    generate: async (a) => {
      calls.push(a.date)
      if (calls.length === 2) throw new Error('model down')
      setCornieText(store, { date: a.date, cornieText: '写好了' })
    }
  })
  assert(calls.length === 2, 'case 7: stops after the failure', calls)
  assert(r.generated.length === 1 && r.error === 'model down', 'case 7: reports error', r)
})

await withStore(async (store) => {
  setAppSetting(store, KEY, 'true')
  chat(store, '2026-09-15')
  upsertUserText(store, { date: '2026-09-15', userText: '我的', cornieText: '' })
  const calls = []
  await runAutoDiary({ store, today: TODAY, generate: async (a) => void calls.push(a.date) })
  assert(calls.length === 1, 'case 8: empty cornieText counts as missing', calls)
})

console.log('tests/services/diary-auto.test.mjs: passed 8/8')
