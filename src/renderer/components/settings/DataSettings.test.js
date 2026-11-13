import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DataSettings from './DataSettings.vue'

afterEach(() => {
  delete window.cornieDesktop
})

function exportButton(wrapper) {
  const native = wrapper.findAll('button').find((b) => b.text().includes('导出'))
  return native
}

describe('DataSettings', () => {
  it('shows where the export was written', async () => {
    window.cornieDesktop = { exportData: vi.fn().mockResolvedValue({ ok: true, path: 'D:/a.zip' }) }
    const wrapper = mount(DataSettings)
    await exportButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('已导出到 D:/a.zip')
  })

  it('stays quiet when the owner cancels', async () => {
    window.cornieDesktop = { exportData: vi.fn().mockResolvedValue({ ok: false, canceled: true }) }
    const wrapper = mount(DataSettings)
    await exportButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('已导出')
    expect(wrapper.text()).not.toContain('失败')
    expect(exportButton(wrapper).element.disabled).toBe(false)
  })

  it('shows the error text on failure', async () => {
    window.cornieDesktop = { exportData: vi.fn().mockResolvedValue({ ok: false, error: 'EACCES' }) }
    const wrapper = mount(DataSettings)
    await exportButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('EACCES')
  })

  it('disables the button without the desktop bridge', () => {
    const wrapper = mount(DataSettings)
    expect(exportButton(wrapper).element.disabled).toBe(true)
  })
})
