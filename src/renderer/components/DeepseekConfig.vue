<script setup>
import { onMounted } from 'vue'
import { useModelSettings } from '../composables/useModelSettings'
import UiButton from './ui/UiButton.vue'

const emit = defineEmits(['back', 'updated'])

const {
  modelSettings,
  form,
  saving,
  loading,
  errorMsg,
  noticeMsg,
  refresh,
  check: checkOnly,
  submit,
  reset,
} = useModelSettings()

async function save() {
  const ok = await submit()
  if (ok) emit('updated')
}

async function clearAll() {
  const ok = await reset()
  if (ok) emit('updated')
}

onMounted(refresh)
</script>

<template>
  <div class="config">
    <header class="configHead">
      <UiButton variant="ghost" @click="$emit('back')">← 返回设置</UiButton>
      <div class="configTitle">DeepSeek 配置</div>
    </header>

    <div v-if="loading" class="configLoading">检查中…</div>

    <form v-else class="configForm" @submit.prevent="save">
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

      <div v-if="modelSettings.maskedApiKey" class="configCurrent">当前已保存：{{ modelSettings.maskedApiKey }}</div>
      <div v-if="errorMsg" class="configError">{{ errorMsg }}</div>
      <div v-if="noticeMsg" class="configNotice">{{ noticeMsg }}</div>

      <div class="configActions">
        <UiButton variant="default" :disabled="saving" type="submit">
          {{ saving ? '保存中…' : '保存并检测' }}
        </UiButton>
        <UiButton variant="outline" :disabled="saving" type="button" @click="checkOnly">只检测</UiButton>
        <UiButton
          v-if="modelSettings.configured"
          variant="dangerGhost"
          :disabled="saving"
          type="button"
          @click="clearAll"
        >
          清空钥匙
        </UiButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.config {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
.configHead {
  display: flex;
  align-items: center;
  gap: 14px;
}
.configTitle {
  font-size: var(--text-xl);
  font-weight: 800;
}

.configLoading {
  text-align: center;
  color: var(--muted);
  padding: 40px;
}

.configForm {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 560px;
}
.configForm label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--text-base);
  font-weight: 600;
}

.configCurrent,
.configError,
.configNotice {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
}
.configCurrent {
  background: color-mix(in srgb, var(--color-accent) 6%, transparent);
}
.configError {
  background: color-mix(in srgb, var(--color-danger) 6%, transparent);
  color: var(--danger);
}
.configNotice {
  background: color-mix(in srgb, var(--color-success) 6%, transparent);
  color: var(--success);
}
.configActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
