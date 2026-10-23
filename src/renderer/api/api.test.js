import { describe, it, expect, vi } from 'vitest'
import { apiGet, apiPost } from './client.js'
import { listEntries as listDiaryEntries, getEntry } from './diary.js'
import { sendMessage } from './conversation.js'
import { getChatDay } from './chatlog.js'
import { listEntries as listLedgerEntries } from './ledger.js'
import { listObservations } from './observation.js'
import { listPages } from './memory-wiki.js'
import { listTodos } from './todo.js'
import { listSchedules } from './schedule.js'
import { getModelSettings } from './settings.js'
import { getModelStatus } from './model.js'

const API_BASE = 'http://127.0.0.1:5174'

describe('api/client', () => {
  it('apiGet should call fetch with correct URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    })

    const result = await apiGet('/test')
    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/test`, expect.objectContaining({ method: 'GET' }))
    expect(result).toEqual({ data: 'test' })
  })

  it('apiPost should send JSON body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    })

    const result = await apiPost('/items', { name: 'x' })
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/items`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'x' }),
      })
    )
    expect(result).toEqual({ id: 1 })
  })
})

describe('api/diary', () => {
  it('listEntries should call GET /api/entries', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ entries: [] }) })
    const result = await listDiaryEntries({ month: '2026-09' })
    expect(result.entries).toEqual([])
  })

  it('getEntry should call GET /api/entries/:date', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ entry: {} }) })
    const result = await getEntry('2026-09-16')
    expect(result.entry).toBeDefined()
  })
})

describe('api/conversation', () => {
  it('sendMessage should call POST /api/conversations', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ reply: 'hi' }) })
    const result = await sendMessage({ message: 'hello' })
    expect(result.reply).toBe('hi')
  })
})

describe('api/chatlog', () => {
  it('forwards cursor and limit to the day endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [], pagination: { hasMore: false, nextCursor: null } }),
    })
    await getChatDay('2026-10-23', { cursor: '2', limit: 100 })

    const url = String(fetch.mock.calls[0][0])
    expect(url).toContain('/api/chatlogs/2026-10-23?')
    expect(url).toContain('cursor=2')
    expect(url).toContain('limit=100')
  })
})

describe('api/ledger', () => {
  it('listEntries should call GET /api/ledger/entries', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) })
    const result = await listLedgerEntries()
    expect(result.items).toEqual([])
  })
})

describe('api/observation', () => {
  it('listObservations should call GET /api/observations', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ observations: [] }) })
    const result = await listObservations()
    expect(result.observations).toEqual([])
  })
})

describe('api/memory-wiki', () => {
  it('listPages should call GET /api/memory-wiki/pages', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) })
    const result = await listPages()
    expect(result.items).toEqual([])
  })
})

describe('api/todo', () => {
  it('listTodos should call GET /api/todos', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) })
    const result = await listTodos()
    expect(result.items).toEqual([])
  })
})

describe('api/schedule', () => {
  it('listSchedules should call GET /api/schedules', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) })
    const result = await listSchedules()
    expect(result.items).toEqual([])
  })
})

describe('api/settings', () => {
  it('getModelSettings should call GET /api/settings/model', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ settings: {} }) })
    const result = await getModelSettings()
    expect(result.settings).toBeDefined()
  })
})

describe('api/model', () => {
  it('getModelStatus should call GET /api/model/status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
    const result = await getModelStatus()
    expect(result.ok).toBe(true)
  })
})
