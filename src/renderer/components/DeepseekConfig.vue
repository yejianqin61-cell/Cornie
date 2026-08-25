<script setup>
import { onMounted } from 'vue'
import { useModelSettings } from '../composables/useModelSettings'

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

      <div v-if="modelSettings.maskedApiKey" class="configCurrent">当前已保存：{{ modelSettings.maskedApiKey }}</div>
      <div v-if="errorMsg" class="configError">{{ errorMsg }}</div>
      <div v-if="noticeMsg" class="configNotice">{{ noticeMsg }}</div>

      <div class="configActions">
        <button class="primary" :disabled="saving" type="submit">
          {{ saving ? '保存中…' : '保存并检测' }}
        </button>
        <button :disabled="saving" type="button" @click="checkOnly">只检测</button>
        <button v-if="modelSettings.configured" class="danger" :disabled="saving" type="button" @click="clearAll">
          清空钥匙
        </button>
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
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}
.configTitle {
  font-size: 18px;
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
  font-size: 13px;
  font-weight: 600;
}

.configCurrent,
.configError,
.configNotice {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
}
.configCurrent {
  border: 1px solid rgba(232, 133, 106, 0.25);
  background: rgba(232, 133, 106, 0.06);
}
.configError {
  border: 1px solid rgba(217, 106, 92, 0.25);
  background: rgba(217, 106, 92, 0.06);
  color: var(--danger);
}
.configNotice {
  border: 1px solid rgba(91, 154, 107, 0.25);
  background: rgba(91, 154, 107, 0.06);
  color: #5b9a6b;
}
.configActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
