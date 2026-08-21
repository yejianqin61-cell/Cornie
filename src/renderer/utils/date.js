// 统一日期工具（Cornie-021 FE-02）。
// 语义固化："今天" = 本地时区日期。禁止用 new Date().toISOString() 取日期（UTC 会跨日错位）。
// 全仓唯一实现，新增"取今天/格式化日期/解析本地日期"一律使用本模块。

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function toLocalDate(dateLike) {
  if (dateLike instanceof Date) {
    return Number.isNaN(dateLike.getTime()) ? null : dateLike
  }
  if (typeof dateLike === 'number') {
    const d = new Date(dateLike)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof dateLike === 'string') {
    const trimmed = dateLike.trim()
    if (DATE_RE.test(trimmed)) return parseLocalDate(trimmed)
    const d = new Date(trimmed)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** 本地时区当天 YYYY-MM-DD。 */
export function today() {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

/** 任意日期输入 → 本地时区 YYYY-MM-DD；非法输入返回 ''。 */
export function formatDate(dateLike) {
  const d = toLocalDate(dateLike)
  if (!d) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 将 YYYY-MM-DD 解析为本地时区零点 Date；非法输入返回 null。 */
export function parseLocalDate(dateStr) {
  if (typeof dateStr !== 'string' || !DATE_RE.test(dateStr.trim())) return null
  const [y, m, d] = dateStr.trim().split('-').map(Number)
  const date = new Date(y, m - 1, d, 0, 0, 0, 0)
  // 校验真实日期：2026-99-99 / 2026-02-30 会被 Date 滚动接受，必须拒绝
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null
  }
  return date
}
