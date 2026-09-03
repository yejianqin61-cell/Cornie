import { describe, expect, it } from 'vitest'
import { formatDate, parseLocalDate, today, DATE_RE } from '../../src/renderer/utils/date'

// 日期工具回归（移植自旧 date-utils.test.mjs）：本地时区纪律是全仓语义基石。

describe('utils/date', () => {
  it('today() 返回本地时区 YYYY-MM-DD', () => {
    expect(today()).toMatch(DATE_RE)
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`
    expect(today()).toBe(expected)
  })

  it('parseLocalDate 解析为本地零点，并拒绝伪日期', () => {
    const d = parseLocalDate('2026-02-14')
    expect(d).not.toBeNull()
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(1)
    expect(d?.getDate()).toBe(14)
    expect(d?.getHours()).toBe(0)

    expect(parseLocalDate('2026-02-30')).toBeNull()
    expect(parseLocalDate('2026-99-01')).toBeNull()
    expect(parseLocalDate('2026-2-14')).toBeNull()
    expect(parseLocalDate('not-a-date')).toBeNull()
    expect(parseLocalDate(null)).toBeNull()
  })

  it('formatDate 归一化任意输入到 YYYY-MM-DD，非法输入返回空串', () => {
    expect(formatDate('2026-02-14')).toBe('2026-02-14')
    expect(formatDate(new Date(2026, 1, 14))).toBe('2026-02-14')
    expect(formatDate('garbage')).toBe('')
  })
})
