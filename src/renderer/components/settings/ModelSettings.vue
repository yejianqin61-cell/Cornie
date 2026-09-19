<script setup>
import { ref, onMounted } from 'vue'
import { Button, Input } from 'neobrutalism-vue'
import { Loader2, RefreshCw, Check } from '@lucide/vue'
import SettingsSection from './SettingsSection.vue'
import { getModelSettings, saveModelSettings, clearModelSettings } from '../../api/settings.js'

const apiKey = ref('')
const baseUrl = ref('')
const model = ref('')

const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getModelSettings()
    apiKey.value = res.settings?.apiKey || ''
    baseUrl.value = res.settings?.baseUrl || ''
    model.value = res.settings?.model || ''
  } catch (e) {
    loadError.value = e.message || '加载失败'
  }
  loading.value = false
}

onMounted(load)

async function save() {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await saveModelSettings({ apiKey: apiKey.value, baseUrl: baseUrl.value, model: model.value })
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  } catch (e) {
    saveError.value = e.message || '保存失败'
  }
  saving.value = false
}

async function clear() {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await clearModelSettings()
    apiKey.value = ''
    baseUrl.value = ''
    model.value = ''
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  } catch (e) {
    saveError.value = e.message || '清除失败'
  }
  saving.value = false
}
</script>

<template>
  <SettingsSection title="DeepSeek 模型" description="配置 API 连接参数">
    <div v-if="loadError" class="model-banner model-banner--error">
      <span>{{ loadError }}</span>
      <Button variant="neutral" size="sm" @click="load">
        <RefreshCw :size="12" /> 重试
      </Button>
    </div>

    <div v-if="loading" class="model-skeleton">
      <div class="model-skeleton-line" v-for="n in 3" :key="n" />
    </div>

    <div v-else class="model-fields">
      <label class="model-field">
        <span>API Key</span>
        <Input v-model="apiKey" type="password" placeholder="sk-..." :disabled="saving" />
      </label>
      <label class="model-field">
        <span>Base URL</span>
        <Input v-model="baseUrl" placeholder="https://api.deepseek.com" :disabled="saving" />
      </label>
      <label class="model-field">
        <span>模型名称</span>
        <Input v-model="model" placeholder="deepseek-chat" :disabled="saving" />
      </label>
    </div>

    <div v-if="saveError" class="model-banner model-banner--error">{{ saveError }}</div>
    <div v-if="saveSuccess" class="model-banner model-banner--success">
      <Check :size="14" /> 已保存
    </div>

    <div class="model-actions">
      <Button :disabled="saving" @click="save">
        <Loader2 v-if="saving" :size="14" class="spin" />
        {{ saving ? '保存中...' : '保存' }}
      </Button>
      <Button variant="neutral" :disabled="saving" @click="clear">
        <Loader2 v-if="saving" :size="14" class="spin" />
        清除
      </Button>
    </div>
  </SettingsSection>
</template>

<style scoped>
.model-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.model-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nb-text-secondary);
}

.model-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.model-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.model-banner--error {
  background: #fef2f2;
  border: 1.5px solid #fca5a5;
  color: #b91c1c;
}

.model-banner--success {
  background: #f0fdf4;
  border: 1.5px solid #86efac;
  color: #15803d;
}

.model-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.model-skeleton-line {
  height: 2.25rem;
  border-radius: 0.5rem;
  background: var(--nb-border);
  animation: pulse 1.5s ease-in-out infinite;
}

.model-skeleton-line:nth-child(2) { width: 80%; }
.model-skeleton-line:nth-child(3) { width: 60%; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>