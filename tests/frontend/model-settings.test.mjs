import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/renderer/api', () => ({
  getModelStatus: vi.fn(),
  getModelSettings: vi.fn(),
  saveModelSettings: vi.fn(),
  clearModelSettings: vi.fn()
}))

import {
  clearModelSettings,
  getModelSettings,
  getModelStatus,
  saveModelSettings
} from '../../src/renderer/api'
import { useModelSettings } from '../../src/renderer/composables/useModelSettings'

const mockStatus = { ok: true, configured: true, provider: 'deepseek', model: 'deepseek-chat' }
const mockSettings = {
  settings: {
    configured: true,
    maskedApiKey: 'sk-****1234',
    baseUrl: '',
    model: 'deepseek-chat',
    timeoutMs: 30000
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  getModelStatus.mockResolvedValue(mockStatus)
  getModelSettings.mockResolvedValue(mockSettings)
  saveModelSettings.mockResolvedValue({ ok: true })
  clearModelSettings.mockResolvedValue({ ok: true })
})

describe('useModelSettings (FE-06)', () => {
  it('refresh 成功时回填状态与表单', async () => {
    const s = useModelSettings()
    await s.refresh()
    expect(s.loading.value).toBe(false)
    expect(s.modelStatus.value).toEqual(mockStatus)
    expect(s.modelSettings.value).toEqual(mockSettings.settings)
    expect(s.form.value).toEqual({
      apiKey: '',
      baseUrl: '',
      model: 'deepseek-chat',
      timeoutMs: '30000'
    })
  })

  it('refresh 失败时设置失败状态与错误文案', async () => {
    getModelStatus.mockRejectedValue(new Error('network down'))
    const s = useModelSettings()
    await s.refresh()
    expect(s.loading.value).toBe(false)
    expect(s.modelStatus.value.configured).toBe(false)
    expect(s.errorMsg.value).toContain('铃湾没能连上')
  })

  it('submit 成功：保存参数正确、刷新并返回 true', async () => {
    const s = useModelSettings()
    s.form.value.apiKey = 'sk-test'
    const ok = await s.submit()
    expect(ok).toBe(true)
    expect(saveModelSettings).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseUrl: '',
      model: 'deepseek-chat',
      timeoutMs: '30000'
    })
    expect(getModelStatus).toHaveBeenCalled()
    expect(getModelSettings).toHaveBeenCalled()
    expect(s.noticeMsg.value).toContain('铃湾已经把钥匙收好啦')
  })

  it('submit 失败：缺 Key 映射为对应文案并返回 false', async () => {
    saveModelSettings.mockRejectedValue(new Error('apiKey is required'))
    const s = useModelSettings()
    const ok = await s.submit()
    expect(ok).toBe(false)
    expect(s.errorMsg.value).toContain('API Key')
  })

  it('submit 失败：网络/超时类错误映射为敲门文案', async () => {
    saveModelSettings.mockRejectedValue(new Error('fetch failed: timeout'))
    const s = useModelSettings()
    const ok = await s.submit()
    expect(ok).toBe(false)
    expect(s.errorMsg.value).toContain('敲门')
  })

  it('reset 成功：清空钥匙、刷新并返回 true', async () => {
    const s = useModelSettings()
    const ok = await s.reset()
    expect(ok).toBe(true)
    expect(clearModelSettings).toHaveBeenCalled()
    expect(s.noticeMsg.value).toContain('钥匙收起来啦')
  })

  it('check 成功与失败分别给出对应提示', async () => {
    const s = useModelSettings()
    await s.check()
    expect(s.modelStatus.value).toEqual(mockStatus)
    expect(s.noticeMsg.value).toContain('连上啦')

    getModelStatus.mockRejectedValue(new Error('boom'))
    await s.check()
    expect(s.modelStatus.value.configured).toBe(false)
    expect(s.errorMsg.value).toContain('检测失败')
  })

  it('toFriendlyError 覆盖空错误与未知名错误', () => {
    const s = useModelSettings()
    expect(s.toFriendlyError('')).toContain('收好')
    expect(s.toFriendlyError(new Error('something unknown'))).toContain('没成功')
    expect(s.toFriendlyError(new Error('invalid timeout'))).toContain('正整数')
  })
})
