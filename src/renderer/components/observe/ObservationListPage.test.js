import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listObservations: vi.fn(),
  getObservation: vi.fn(),
  createObservation: vi.fn(),
  updateObservation: vi.fn(),
  deleteObservation: vi.fn(),
}))

vi.mock('../../api/observation.js', () => api)

import ObservationListPage from './ObservationListPage.vue'

beforeEach(() => {
  vi.resetAllMocks()
  api.listObservations.mockResolvedValue({
    observations: [{ id: 'o1', title: '钟奕菲', date: '2026-08-21', type: 'note' }],
  })
  api.getObservation.mockResolvedValue({
    observation: { id: 'o1', title: '钟奕菲', content: '高中同桌', memoryLinks: [{ pageId: 'p1', title: '钟奕菲' }] },
  })
})

describe('ObservationListPage memory navigation', () => {
  it('re-emits openMemory with the page id from the detail view', async () => {
    const wrapper = mount(ObservationListPage, {
      global: { stubs: { Button: { template: '<button><slot /></button>' } } },
    })
    await flushPromises()
    await wrapper.vm.openDetail('o1')
    await flushPromises()

    await wrapper.get('.obs-memory-link').trigger('click')

    expect(wrapper.emitted('openMemory')[0]).toEqual(['p1'])
  })
})
