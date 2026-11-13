import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import yauzl from 'yauzl'
import initSqlJs from 'sql.js'

import { buildExportArchive } from '../../electron/backend/export/exporter.js'
import { getAppSetting, setAppSetting, upsertUserText, getEntry } from '../../electron/db.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

const SECRET = 'sk-secret-for-test'
const KEY = 'settings.model.deepseek.apiKey'

function readZip(buffer) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err)
      const out = new Map()
      zip.on('error', reject)
      zip.on('end', () => resolve(out))
      zip.on('entry', (entry) => {
        zip.openReadStream(entry, (e, stream) => {
          if (e) return reject(e)
          const chunks = []
          stream.on('data', (c) => chunks.push(c))
          stream.on('end', () => {
            out.set(entry.fileName, Buffer.concat(chunks))
            zip.readEntry()
          })
        })
      })
      zip.readEntry()
    })
  })
}

async function makeMemoryRoot(harness) {
  const root = path.join(harness.baseDir, 'data', 'memory-wiki')
  await fs.mkdir(path.join(root, 'pages', 'event'), { recursive: true })
  await fs.mkdir(path.join(root, 'index'), { recursive: true })
  await fs.writeFile(path.join(root, 'pages', 'event', '咖啡.md'), '# 咖啡\n喜欢拿铁\n', 'utf8')
  await fs.writeFile(path.join(root, 'index', 'page-index.json'), '{"pages":[]}', 'utf8')
  return root
}

const harness = await createServiceHarness('export')
try {
  const { store } = harness
  const memoryRoot = await makeMemoryRoot(harness)
  upsertUserText(store, { date: '2026-09-15', userText: '今天喝了咖啡', cornieText: '' })
  setAppSetting(store, KEY, `safeStorage:v1:${SECRET}`)
  setAppSetting(store, 'settings.model.deepseek.model', 'deepseek-chat')
  const now = new Date('2026-11-12T21:05:09')

  const archive = await buildExportArchive({ store, memoryRoot, now })
  const files = await readZip(archive)

  // case 1
  for (const name of [
    'cornie.sqlite3',
    'memory-wiki/pages/event/咖啡.md',
    'memory-wiki/index/page-index.json',
    'manifest.json'
  ]) {
    assert(files.has(name), `case 1: missing ${name}`, [...files.keys()])
  }

  // case 2
  const original = await fs.readFile(path.join(memoryRoot, 'pages', 'event', '咖啡.md'))
  assert(files.get('memory-wiki/pages/event/咖啡.md').equals(original), 'case 2: byte-identical content')

  // case 3
  const SQL = await initSqlJs()
  const exported = new SQL.Database(files.get('cornie.sqlite3'))
  const diary = exported.exec("select user_text from diary_entries where date='2026-09-15'")
  assert(diary[0]?.values[0][0] === '今天喝了咖啡', 'case 3: diary row present', diary)
  const keyRows = exported.exec(`select value from meta where key='${KEY}'`)
  assert(keyRows.length === 0, 'case 3: key row absent in the export', keyRows)

  // case 4
  const model = exported.exec("select value from meta where key='settings.model.deepseek.model'")
  assert(model[0]?.values[0][0] === 'deepseek-chat', 'case 4: other settings are kept', model)
  exported.close()
  assert(getAppSetting(store, KEY) === `safeStorage:v1:${SECRET}`, 'case 4: the live database still has the key')

  // case 5
  assert(!archive.includes(Buffer.from(SECRET)), 'case 5: secret not in archive bytes')
  assert(!files.get('cornie.sqlite3').includes(Buffer.from(SECRET)), 'case 5: secret not in the database bytes')
  assert(getEntry(store, '2026-09-15').userText === '今天喝了咖啡', 'live database untouched')

  // case 7
  const manifest = JSON.parse(files.get('manifest.json').toString('utf8'))
  assert(manifest.exportedAt === now.toISOString(), 'case 7: exportedAt', manifest)
  assert(
    JSON.stringify([...manifest.files].sort()) === JSON.stringify([...files.keys()].sort()),
    'case 7: manifest matches the archive',
    { manifest, actual: [...files.keys()] }
  )

  // case 6
  const bare = await readZip(
    await buildExportArchive({ store, memoryRoot: path.join(harness.baseDir, 'no-such-dir'), now })
  )
  assert(
    JSON.stringify([...bare.keys()].sort()) === JSON.stringify(['cornie.sqlite3', 'manifest.json']),
    'case 6: no memory-wiki entries when the directory is missing',
    [...bare.keys()]
  )
} finally {
  await harness.close()
}

console.log('tests/services/export.test.mjs: passed 7/7')
