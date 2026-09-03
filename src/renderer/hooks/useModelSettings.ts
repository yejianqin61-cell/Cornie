// 模型设置单一状态源（Cornie-021 FE-06；从 Vue 版迁移为 React hook）。
// 主壳层（App 引导/设置）与 DeepseekConfig 共用本 hook：状态、动作、友好文案唯一实现。
// 注意：React 中无全局单例 ref——每个组件树位置各自调用；外壳与设置页如需共享
// 状态，通过 props 传递（外壳持有一次，设置页接收），与旧行为一致。

import { useCallback, useEffect, useState } from 'react'
import { clearModelSettings, getModelSettings, getModelStatus, saveModelSettings } from '../api'

export interface ModelStatus {
  ok: boolean
  configured: boolean
  provider: string
  model: string
  reason: string
  [key: string]: unknown
}

export interface ModelSettingsState {
  configured: boolean
  maskedApiKey: string
  baseUrl: string
  model: string
  timeoutMs: number | null
  [key: string]: unknown
}

export interface ModelSettingsForm {
  apiKey: string
  baseUrl: string
  model: string
  timeoutMs: string
}

function fallbackStatus(): ModelStatus {
  return { ok: false, configured: false, provider: 'deepseek', model: '', reason: 'request_failed' }
}

export function toFriendlyError(error: unknown): string {
  const raw = String((error as { message?: string })?.message || error || '').trim()
  if (!raw) return '铃湾刚刚没把设置收好，我们再试一次就好。'
  if (/apiKey is required/i.test(raw)) return 'API Key 这一栏还是空的，铃湾还没拿到钥匙呢。'
  if (/invalid timeout/i.test(raw)) return '超时毫秒要填成正整数呀，比如 30000。'
  if (/http_|request_failed|fetch|network|timeout/i.test(raw))
    return '铃湾刚刚去敲门时没收到顺利回应，可能是网络、地址或者钥匙状态出了点小岔子。'
  return '这次保存没成功，不过别担心，我们检查一下输入内容再试一次就好。'
}

export function useModelSettings() {
  const [modelStatus, setModelStatus] = useState<ModelStatus>(fallbackStatus)
  const [modelSettings, setModelSettings] = useState<ModelSettingsState>({
    configured: false,
    maskedApiKey: '',
    baseUrl: '',
    model: '',
    timeoutMs: null,
  })
  const [form, setForm] = useState<ModelSettingsForm>({
    apiKey: '',
    baseUrl: '',
    model: 'deepseek-chat',
    timeoutMs: '30000',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [noticeMsg, setNoticeMsg] = useState('')

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    setErrorMsg('')
    try {
      const [statusData, settingsData] = await Promise.all([getModelStatus(), getModelSettings()])
      const settings = (settingsData as { settings?: ModelSettingsState }).settings as ModelSettingsState
      setModelStatus(statusData as ModelStatus)
      setModelSettings(settings)
      setForm({
        apiKey: '',
        baseUrl: settings?.baseUrl || '',
        model: settings?.model || 'deepseek-chat',
        timeoutMs: settings?.timeoutMs ? String(settings.timeoutMs) : '30000',
      })
    } catch {
      setModelStatus(fallbackStatus())
      setErrorMsg('铃湾没能连上，我们可以稍后再试。')
    } finally {
      setLoading(false)
    }
  }, [])

  const check = useCallback(async ({ silent = false }: { silent?: boolean } = {}): Promise<ModelStatus | null> => {
    try {
      const data = (await getModelStatus()) as ModelStatus
      setModelStatus(data)
      if (!silent) {
        if (data.ok) setNoticeMsg('铃湾已经连上啦！')
        else setNoticeMsg('还没连上，检查下钥匙和网络。')
      }
      return data
    } catch {
      setModelStatus(fallbackStatus())
      if (!silent) setErrorMsg('检测失败，稍后再试。')
      return null
    }
  }, [])

  const submit = useCallback(async (): Promise<boolean> => {
    setSaving(true)
    setErrorMsg('')
    setNoticeMsg('')
    try {
      await saveModelSettings({
        apiKey: form.apiKey,
        baseUrl: form.baseUrl,
        model: form.model,
        timeoutMs: form.timeoutMs,
      })
      setNoticeMsg('铃湾已经把钥匙收好啦，现在去重新确认连接状态。')
      await refresh()
      await check({ silent: true })
      return true
    } catch (error) {
      setErrorMsg(toFriendlyError(error))
      return false
    } finally {
      setSaving(false)
    }
  }, [form, refresh, check])

  const reset = useCallback(async (): Promise<boolean> => {
    setSaving(true)
    setErrorMsg('')
    setNoticeMsg('')
    try {
      await clearModelSettings()
      setNoticeMsg('已经把本地保存的钥匙收起来啦。')
      await refresh()
      await check({ silent: true })
      return true
    } catch (error) {
      setErrorMsg(toFriendlyError(error))
      return false
    } finally {
      setSaving(false)
    }
  }, [refresh, check])

  // submit/reset 依赖 form，但 form 是组件内部状态——暴露 setter 供受控表单使用
  const updateForm = useCallback((patch: Partial<ModelSettingsForm>): void => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    modelStatus,
    modelSettings,
    form,
    updateForm,
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
