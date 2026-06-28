<script setup>
import { ref, onMounted } from 'vue'
import { getModelStatus, getModelSettings, saveModelSettings, clearModelSettings } from '../api'

const emit = defineEmits(['back', 'updated'])

const modelStatus = ref({ ok: false, configured: false, model: '' })
const modelSettings = ref({ configured: false, maskedApiKey: '' })
const form = ref({ apiKey: '', baseUrl: '', model: 'deepseek-chat', timeoutMs: '30000' })
const saving = ref(false)
const loading = ref(true)
const errorMsg = ref('')
const noticeMsg = ref('')

function toFriendlyError(error) {
  const raw = String(error?.message || error || '').trim()
  if (!raw) return '铃湾刚刚没把设置收好，我们再试一次就好。'
  if (/apiKey is required/i.test(raw)) return 'API Key 不能为空。'
  if (/invalid timeout/i.test(raw)) return '超时毫秒要填成正整数。'
  if (/http_|request_failed|fetch|network|timeout/i.test(raw))
    return '铃湾敲门时没收到回应，检查一下网络或地址。'
  return '保存没成功，检查一下输入再试一次。'
}

async function refreshState() {
  loading.value = true
  try {
    const [statusData, settingsData] = await Promise.all([getModelStatus(), getModelSettings()])
    modelStatus.value = statusData
    modelSettings.value = settingsData.settings
    form.value = {
      apiKey: '',
      baseUrl: settingsData.settings.baseUrl || '',
      model: settingsData.settings.model || 'deepseek-chat',
      timeoutMs: settingsData.settings.timeoutMs ? String(settingsData.settings.timeoutMs) : '30000'
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function save() {
  saving.value = true
  errorMsg.value = ''
  noticeMsg.value = ''
  try {
    await saveModelSettings({
      apiKey: form.value.apiKey,
      baseUrl: form.value.baseUrl,
      model: form.value.model,
      timeoutMs: form.value.timeoutMs
    })
    noticeMsg.value = '铃湾已经把钥匙收好啦。'
    await refreshState()
    emit('updated')
  } catch (e) {
    errorMsg.value = toFriendlyError(e)
  } finally {
    saving.value = false
  }
}

async function clearAll() {
  saving.value = true
  errorMsg.value = ''
  noticeMsg.value = ''
  try {
    await clearModelSettings()
    noticeMsg.value = '已清空本地保存的钥匙。'
    await refreshState()
    emit('updated')
  } catch (e) {
    errorMsg.value = toFriendlyError(e)
  } finally {
    saving.value = false
  }
}

async function checkOnly() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await getModelStatus()
    modelStatus.value = data
    if (data.ok) noticeMsg.value = '铃湾已经连上啦！'
    else noticeMsg.value = '还没连上，检查下钥匙和网络。'
  } catch {
    errorMsg.value = '检测失败，稍后再试。'
  } finally {
    loading.value = false
  }
}

onMounted(refreshState)
</script>

<template>
  <div class="config">
    <header class="configHead">
      <button class="ghost" @click="$emit('back')">← 返回设置</button>
      <div class="configTitle">DeepSeek 配置</div>
    </header>

    <div v-if="loading" class="configLoading">检查中…</div>

    <form v-else class="configForm card" @submit.prevent="save">
      <label>
        <span>DeepSeek API Key</span>
        <input v-model="form.apiKey" type="password" autocomplete="off" placeholder="把你的钥匙放在这里" />
      </label>
      <label>
        <span>Base URL（可留空）</span>
        <input v-model="form.baseUrl" placeholder="默认地址即可" />
      </label>
      <label>
        <span>模型名</span>
        <input v-model="form.model" placeholder="deepseek-chat" />
      </label>
      <label>
        <span>超时毫秒</span>
        <input v-model="form.timeoutMs" inputmode="numeric" placeholder="30000" />
      </label>

      <div v-if="modelSettings.maskedApiKey" class="configCurrent">
        当前已保存：{{ modelSettings.maskedApiKey }}
      </div>
      <div v-if="errorMsg" class="configError">{{ errorMsg }}</div>
      <div v-if="noticeMsg" class="configNotice">{{ noticeMsg }}</div>

      <div class="configActions">
        <button class="primary" :disabled="saving" type="submit">
          {{ saving ? '保存中…' : '保存并检测' }}
        </button>
        <button :disabled="saving" type="button" @click="checkOnly">只检测</button>
        <button
          v-if="modelSettings.configured"
          class="danger"
          :disabled="saving"
          type="button"
          @click="clearAll"
        >
          清空钥匙
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.config{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
.configHead{
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}
.configTitle{ font-size: 18px; font-weight: 800; }

.configLoading{ text-align: center; color: var(--muted); padding: 40px; }

.configForm{
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 560px;
}
.configForm label{
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

.configCurrent,
.configError,
.configNotice{
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
}
.configCurrent{
  border: 1px solid rgba(232,133,106,.25);
  background: rgba(232,133,106,.06);
}
.configError{
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
}
.configNotice{
  border: 1px solid rgba(91,154,107,.25);
  background: rgba(91,154,107,.06);
  color: #5B9A6B;
}
.configActions{ display: flex; gap: 10px; flex-wrap: wrap; }
</style>
