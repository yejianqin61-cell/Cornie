<script setup>
import { ref } from 'vue'
import AppButton from '../common/AppButton.vue'
import SettingsSection from './SettingsSection.vue'

const hasBridge = Boolean(window.cornieDesktop?.exportData)
const exporting = ref(false)
const exportedPath = ref('')
const error = ref('')

async function exportData() {
  const bridge = window.cornieDesktop
  if (!bridge?.exportData || exporting.value) return
  exporting.value = true
  exportedPath.value = ''
  error.value = ''
  try {
    const res = await bridge.exportData()
    if (res?.ok) exportedPath.value = res.path
    else if (!res?.canceled) error.value = res?.error || '导出失败'
  } catch (e) {
    error.value = e.message || '导出失败'
  }
  exporting.value = false
}
</script>

<template>
  <SettingsSection title="数据">
    <AppButton :disabled="exporting || !hasBridge" @click="exportData">
      {{ exporting ? '导出中...' : '导出数据' }}
    </AppButton>
    <p v-if="exportedPath" class="data-ok">已导出到 {{ exportedPath }}</p>
    <p v-if="error" class="data-error">{{ error }}</p>
  </SettingsSection>
</template>

<style scoped>
.data-ok,
.data-error {
  margin-top: 0.5rem;
  font-size: 0.875rem;
}
.data-error {
  color: #d33;
}
</style>
