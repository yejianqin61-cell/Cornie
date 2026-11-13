<script setup>
import { ref, onMounted } from 'vue'
import SettingsSection from './SettingsSection.vue'
import { getDiaryAutoSetting, saveDiaryAutoSetting } from '../../api/settings.js'

const enabled = ref(false)
const saving = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    const res = await getDiaryAutoSetting()
    enabled.value = Boolean(res.settings?.enabled)
  } catch (e) {
    error.value = e.message || '加载失败'
  }
})

async function onChange(event) {
  const next = event.target.checked
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    const res = await saveDiaryAutoSetting(next)
    enabled.value = Boolean(res?.settings?.enabled ?? next)
  } catch (e) {
    error.value = e.message || '保存失败'
    event.target.checked = enabled.value
  }
  saving.value = false
}
</script>

<template>
  <SettingsSection title="日记">
    <label class="diary-auto">
      <input type="checkbox" :checked="enabled" :disabled="saving" @change="onChange" />
      <span>自动生成 Cornie 日记（会调用模型）</span>
    </label>
    <p v-if="error" class="diary-auto-error">{{ error }}</p>
  </SettingsSection>
</template>

<style scoped>
.diary-auto {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.diary-auto-error {
  margin-top: 0.5rem;
  color: #d33;
  font-size: 0.875rem;
}
</style>
