// 模型设置单一状态源（Cornie-021 FE-06）。
// 主壳层（App.vue 引导/设置）与 DeepseekConfig 共用本组合式：状态、动作、友好文案唯一实现。

import { ref } from 'vue'
import { clearModelSettings, getModelSettings, getModelStatus, saveModelSettings } from '../api'

export function useModelSettings() {
  const modelStatus = ref({ ok: false, configured: false, provider: 'deepseek', model: '', reason: '' })
  const modelSettings = ref({ configured: false, maskedApiKey: '', baseUrl: '', model: '', timeoutMs: null })
  const form = ref({ apiKey: '', baseUrl: '', model: 'deepseek-chat', timeoutMs: '30000' })
  const saving = ref(false)
  const loading = ref(true)
  const errorMsg = ref('')
  const noticeMsg = ref('')

  function toFriendlyError(error) {
    const raw = String(error?.message || error || '').trim()
    if (!raw) return '铃湾刚刚没把设置收好，我们再试一次就好。'
    if (/apiKey is required/i.test(raw)) return 'API Key 这一栏还是空的，铃湾还没拿到钥匙呢。'
    if (/invalid timeout/i.test(raw)) return '超时毫秒要填成正整数呀，比如 30000。'
    if (/http_|request_failed|fetch|network|timeout/i.test(raw))
      return '铃湾刚刚去敲门时没收到顺利回应，可能是网络、地址或者钥匙状态出了点小岔子。'
    return '这次保存没成功，不过别担心，我们检查一下输入内容再试一次就好。'
  }

  function fallbackStatus() {
    return { ok: false, configured: false, provider: 'deepseek', model: '', reason: 'request_failed' }
  }

  async function refresh() {
    loading.value = true
    errorMsg.value = ''
    try {
      const [statusData, settingsData] = await Promise.all([getModelStatus(), getModelSettings()])
      modelStatus.value = statusData
      modelSettings.value = settingsData.settings
      form.value = {
        apiKey: '',
        baseUrl: settingsData.settings.baseUrl || '',
        model: settingsData.settings.model || 'deepseek-chat',
        timeoutMs: settingsData.settings.timeoutMs ? String(settingsData.settings.timeoutMs) : '30000',
      }
    } catch {
      modelStatus.value = fallbackStatus()
      errorMsg.value = '铃湾没能连上，我们可以稍后再试。'
    } finally {
      loading.value = false
    }
  }

  async function check({ silent = false } = {}) {
    try {
      const data = await getModelStatus()
      modelStatus.value = data
      if (!silent) {
        if (data.ok) noticeMsg.value = '铃湾已经连上啦！'
        else noticeMsg.value = '还没连上，检查下钥匙和网络。'
      }
      return data
    } catch {
      modelStatus.value = fallbackStatus()
      if (!silent) errorMsg.value = '检测失败，稍后再试。'
      return null
    }
  }

  async function submit() {
    saving.value = true
    errorMsg.value = ''
    noticeMsg.value = ''
    try {
      await saveModelSettings({
        apiKey: form.value.apiKey,
        baseUrl: form.value.baseUrl,
        model: form.value.model,
        timeoutMs: form.value.timeoutMs,
      })
      noticeMsg.value = '铃湾已经把钥匙收好啦，现在去重新确认连接状态。'
      await refresh()
      await check({ silent: true })
      return true
    } catch (error) {
      errorMsg.value = toFriendlyError(error)
      return false
    } finally {
      saving.value = false
    }
  }

  async function reset() {
    saving.value = true
    errorMsg.value = ''
    noticeMsg.value = ''
    try {
      await clearModelSettings()
      noticeMsg.value = '已经把本地保存的钥匙收起来啦。'
      await refresh()
      await check({ silent: true })
      return true
    } catch (error) {
      errorMsg.value = toFriendlyError(error)
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    modelStatus,
    modelSettings,
    form,
    saving,
    loading,
    errorMsg,
    noticeMsg,
    refresh,
    check,
    submit,
    reset,
    toFriendlyError,
  }
}
