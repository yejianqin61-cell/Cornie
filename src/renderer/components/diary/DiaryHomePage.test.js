import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const api = vi.hoisted(() => ({
  listEntries: vi.fn(),
  getEntry: vi.fn(),
  upsertEntry: vi.fn(),
  regenerateCornie: vi.fn(),
  getOnThisDay: vi.fn(),
}))
vi.mock('../../api/diary.js', () => api)

import DiaryHomePage from './DiaryHomePage.vue'

afterEach(() => {
  delete window.cornieDesktop
})

describe('DiaryHomePage', () => {
  it('reloads the month when a diary change is broadcast', async () => {
    let emit
    window.cornieDesktop = { onDataChanged: (h) => ((emit = h), () => {}) }
    api.listEntries.mockResolvedValue({ entries: [] })
    api.getEntry.mockResolvedValue({ entry: null })
    api.getOnThisDay.mockResolvedValue({ items: [] })
    const wrapper = mount(DiaryHomePage)
    await flushPromises()
    const before = api.listEntries.mock.calls.length
    emit({ domain: 'diary' })
    await flushPromises()
    expect(api.listEntries.mock.calls.length).toBe(before + 1)
    wrapper.unmount()
  })
})
