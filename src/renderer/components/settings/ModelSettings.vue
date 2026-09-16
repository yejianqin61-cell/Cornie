<script setup>
import { ref, onMounted } from 'vue'
import { Button, Input } from 'neobrutalism-vue'
import SettingsSection from './SettingsSection.vue'
import { getModelSettings, saveModelSettings, clearModelSettings } from '../../api/settings.js'

const apiKey = ref('')
const baseUrl = ref('')
const model = ref('')
const saved = ref(false)

async function load() {
  try {
    const res = await getModelSettings()
    apiKey.value = res.settings?.apiKey || ''
    baseUrl.value = res.settings?.baseUrl || ''
    model.value = res.settings?.model || ''
  } catch { /* ignore */ }
}

onMounted(load)

async function save() {
  try {
    await saveModelSettings({ apiKey: apiKey.value, baseUrl: baseUrl.value, model: model.value })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } catch { /* ignore */ }
}

async function clear() {
  try {
    await clearModelSettings()
    apiKey.value = ''
    baseUrl.value = ''
    model.value = ''
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } catch { /* ignore */ }
}
</script>

<template>
  <SettingsSection title="DeepSeek 模型" description="配置 API 连接参数">
    <div class="model-fields">
      <label class="model-field">
        <span>API Key</span>
        <Input v-model="apiKey" type="password" placeholder="sk-..." />
      </label>
      <label class="model-field">
        <span>Base URL</span>
        <Input v-model="baseUrl" placeholder="https://api.deepseek.com" />
      </label>
      <label class="model-field">
        <span>模型名称</span>
        <Input v-model="model" placeholder="deepseek-chat" />
      </label>
    </div>
    <div class="model-actions">
      <Button @click="save">{{ saved ? '已保存' : '保存' }}</Button>
      <Button variant="neutral" @click="clear">清除</Button>
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
</style>