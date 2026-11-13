import { describe, it, expect, vi, afterEach } from 'vitest'
import { domainOfPath, notifyDataChanged, onDataChanged } from './data-sync.js'
import { apiGet, apiPost } from './api/client.js'

afterEach(() => {
  delete window.cornieDesktop
})

describe('data-sync', () => {
  it('maps paths to domains', () => {
    expect(domainOfPath('/api/todo-categories/c1/reorder')).toBe('todo')
    expect(domainOfPath('/api/ledger/entries/expense')).toBe('ledger')
    expect(domainOfPath('/api/settings/model')).toBe('')
  })

  it('is silent without a bridge', () => {
    expect(() => notifyDataChanged({ domain: 'todo' })).not.toThrow()
    expect(() => onDataChanged(['todo'], () => {})()).not.toThrow()
  })

  it('filters by domain and supports unsubscribe', () => {
    let emit
    const off = vi.fn()
    window.cornieDesktop = { onDataChanged: (h) => ((emit = h), off) }
    const handler = vi.fn()
    const unsubscribe = onDataChanged(['todo'], handler)
    emit({ domain: 'schedule' })
    expect(handler).not.toHaveBeenCalled()
    emit({ domain: '*' })
    expect(handler).toHaveBeenCalledTimes(1)
    unsubscribe()
    expect(off).toHaveBeenCalled()
  })
})

describe('client broadcasts', () => {
  function bridge() {
    window.cornieDesktop = { broadcastDataChanged: vi.fn() }
    return window.cornieDesktop.broadcastDataChanged
  }

  it('broadcasts after a successful write', async () => {
    const send = bridge()
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await apiPost('/api/todos', { title: 'x' })
    expect(send).toHaveBeenCalledWith({ domain: 'todo' })
  })

  it('does not broadcast on GET', async () => {
    const send = bridge()
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await apiGet('/api/todos')
    expect(send).not.toHaveBeenCalled()
  })

  it('does not broadcast on failure', async () => {
    const send = bridge()
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'bad' }) })
    await expect(apiPost('/api/todos', {})).rejects.toThrow('bad')
    expect(send).not.toHaveBeenCalled()
  })
})
