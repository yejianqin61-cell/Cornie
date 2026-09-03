import { describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  DEFAULT_TIMEOUT_MS,
  apiFetch,
  listMemoryWikiPages,
} from '../../src/renderer/api'

// API 契约与请求层回归（压缩移植自旧 api-contract.test.mjs，31KB → 聚焦分类语义与归一化）。
// 门禁 verify-task138 要求覆盖 'deepseek upstream timeout' 可读错误文本。

describe('request 层错误分类', () => {
  it('非 2xx → ApiError(http)，message 取响应体 JSON.error 字段', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'deepseek upstream timeout' }), { status: 502 })
      )
    )
    await expect(apiFetch('/model/status')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'http',
      status: 502,
      message: 'deepseek upstream timeout',
    })
  })

  it('非 JSON 响应体 → message 取原文文本', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('plain boom', { status: 500 }))
    )
    await expect(apiFetch('/x')).rejects.toMatchObject({ kind: 'http', message: 'plain boom' })
  })

  it('204 → apiFetch 返回 null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    await expect(apiFetch('/x', { method: 'DELETE' })).resolves.toBeNull()
  })

  it('fetch TypeError → ApiError(network)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    await expect(apiFetch('/x')).rejects.toMatchObject({ kind: 'network' })
  })

  it('默认超时为 30s 常量', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(30_000)
  })
})

describe('memory-wiki 列表归一化（契约保真）', () => {
  it('items 的 id/pageId/content/triggerKeywords/ownerConfirmed 兼容旧字段名', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: [
                {
                  pageId: 'p1',
                  body: '正文A',
                  lastUpdatedAt: '2026-01-02T03:04:05Z',
                  triggerKeywords: 'not-array',
                  ownerConfirmed: 1,
                },
                { id: 'p2', content: '正文B', updatedAt: '2026-01-03T00:00:00Z' },
              ],
            }),
            { status: 200 }
          )
      )
    )
    const data = await listMemoryWikiPages()
    expect(data.items).toHaveLength(2)
    expect(data.pages).toBe(data.items)
    expect(data.items[0]).toMatchObject({
      id: 'p1',
      pageId: 'p1',
      content: '正文A',
      body: '正文A',
      updatedAt: '2026-01-02T03:04:05Z',
      triggerKeywords: [],
      // 契约语义：ownerConfirmed 必须严格 === true，1 视为未确认
      ownerConfirmed: false,
    })
    expect(data.items[1]).toMatchObject({
      id: 'p2',
      pageId: 'p2',
      content: '正文B',
      triggerKeywords: [],
      ownerConfirmed: false,
    })
  })

  it('非数组 items → 空列表兜底', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ items: 'nope' }), { status: 200 })))
    const data = await listMemoryWikiPages()
    expect(data.items).toEqual([])
    expect(data.pages).toEqual([])
  })
})

describe('ApiError 结构', () => {
  it('kind/status/cause 齐全且 name 固定', () => {
    const cause = new Error('inner')
    const err = new ApiError('timeout', 'request timed out after 30000ms', { status: undefined, cause })
    expect(err.name).toBe('ApiError')
    expect(err.kind).toBe('timeout')
    expect(err.cause).toBe(cause)
    expect(err.status).toBeUndefined()
  })
})
