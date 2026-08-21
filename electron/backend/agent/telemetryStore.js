// telemetry 落盘（BE-05）：每轮终态 telemetry 追加到本地 JSONL（按日期分片），提供只读查询。
// 目录可用 CORNIE_TELEMETRY_DIR 环境变量覆盖；默认 data/telemetry（dev 下即仓库 data 目录）。

import fs from 'node:fs'
import path from 'node:path'

export const TELEMETRY_ROOT =
  process.env.CORNIE_TELEMETRY_DIR || path.join(process.cwd(), 'data', 'telemetry')

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function dateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 追加一条终态 telemetry 记录（按记录日期分片）；写盘失败不阻断主流程。 */
export function appendTelemetryRecord(record, { date = new Date() } = {}) {
  if (!record || typeof record !== 'object') {
    return false
  }
  try {
    fs.mkdirSync(TELEMETRY_ROOT, { recursive: true })
    const file = path.join(TELEMETRY_ROOT, `${dateKey(date)}.jsonl`)
    fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8')
    return true
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[telemetry] append failed:', error)
    return false
  }
}

/** 读取某日 telemetry 记录（默认今天）；文件不存在返回空数组。 */
export function listTelemetryRecords({ date } = {}) {
  try {
    const file = path.join(TELEMETRY_ROOT, `${date || dateKey()}.jsonl`)
    if (!fs.existsSync(file)) {
      return []
    }
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}
