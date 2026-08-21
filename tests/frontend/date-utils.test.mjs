import { describe, expect, it, vi } from 'vitest'
import { DATE_RE, formatDate, parseLocalDate, today } from '../../src/renderer/utils/date'

describe('date utils (FE-02)', () => {
  it('today() 使用本地时区而非 UTC', () => {
    // 东八区场景：UTC 仍是前一天，本地已是新的一天。
    vi.useFakeTimers()
    try {
      // 2026-08-21T00:30:00+08:00 == 2026-08-20T16:30:00Z
      const local = new Date(2026, 7, 21, 0, 30, 0) // 本地时区构造
      vi.setSystemTime(local.getTime())
      const utcDate = new Date(local.getTime()).toISOString().slice(0, 10)
      expect(today()).toBe('2026-08-21')
      // 若本机时区为 UTC+8，UTC 日期应为 2026-08-20，证明差异存在
      if (new Date(local.getTime()).getTimezoneOffset() === -480) {
        expect(utcDate).toBe('2026-08-20')
      }
    } finally {
      vi.useRealTimers()
    }
  })

  it('today() 输出格式为 YYYY-MM-DD 且与本地分量一致', () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(today()).toBe(expected)
    expect(DATE_RE.test(today())).toBe(true)
  })

  it('formatDate 接受 Date / 时间戳 / YYYY-MM-DD 字符串', () => {
    expect(formatDate(new Date(2026, 7, 21, 23, 59))).toBe('2026-08-21')
    expect(formatDate(new Date(2026, 7, 21, 23, 59).getTime())).toBe('2026-08-21')
    expect(formatDate('2026-08-21')).toBe('2026-08-21')
    expect(formatDate('not-a-date')).toBe('')
    expect(formatDate(null)).toBe('')
  })

  it('parseLocalDate 解析为本地时区零点', () => {
    const d = parseLocalDate('2026-08-21')
    expect(d).not.toBeNull()
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(21)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(parseLocalDate('2026-99-99')).toBeNull()
    expect(parseLocalDate('')).toBeNull()
    expect(parseLocalDate('2026/08/21')).toBeNull()
  })

  it('formatDate 与 parseLocalDate 往返一致', () => {
    expect(formatDate(parseLocalDate('2026-08-21'))).toBe('2026-08-21')
  })
})
