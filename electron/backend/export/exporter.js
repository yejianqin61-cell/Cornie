import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import initSqlJs from 'sql.js'

const API_KEY_SETTING = 'settings.model.deepseek.apiKey'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((Math.max(date.getFullYear(), 1980) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

function writeZip(files, date) {
  const { time, day } = dosDateTime(date)
  const locals = []
  const centrals = []
  let offset = 0

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const raw = file.data
    const compressed = zlib.deflateRawSync(raw)
    const crc = crc32(raw)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(day, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, name, compressed)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(day, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)

    offset += local.length + name.length + compressed.length
  }

  const centralBuffer = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBuffer.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralBuffer, end])
}

async function snapshotWithoutApiKey(store) {
  // 在新的内存库副本上删除密钥行，绝不修改正在使用的库。
  const SQL = await initSqlJs()
  const copy = new SQL.Database(store.db.export())
  try {
    // delete 只是把页标记为空闲，密钥明文仍留在文件里；先清零再整库重建才真正抹掉。
    copy.run('pragma secure_delete = on')
    copy.run('delete from meta where key = $key', { $key: API_KEY_SETTING })
    copy.run('vacuum')
    return Buffer.from(copy.export())
  } finally {
    copy.close()
  }
}

async function collectFiles(root, relative = '') {
  let entries
  try {
    entries = await fs.readdir(path.join(root, relative), { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const files = []
  for (const entry of entries) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...(await collectFiles(root, rel)))
    else if (entry.isFile()) files.push(rel)
  }
  return files.sort()
}

export async function buildExportArchive({ store, memoryRoot, now = new Date() }) {
  const files = [{ name: 'cornie.sqlite3', data: await snapshotWithoutApiKey(store) }]

  for (const rel of await collectFiles(memoryRoot)) {
    try {
      files.push({ name: `memory-wiki/${rel}`, data: await fs.readFile(path.join(memoryRoot, rel)) })
    } catch (error) {
      // 读取途中被删除的文件不属于这次导出。
      if (error.code !== 'ENOENT') throw error
    }
  }

  const manifest = {
    app: 'Cornie',
    exportedAt: now.toISOString(),
    files: [...files.map((f) => f.name), 'manifest.json']
  }
  files.push({ name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') })
  return writeZip(files, now)
}
