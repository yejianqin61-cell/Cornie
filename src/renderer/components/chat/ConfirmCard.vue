<script setup>
import { computed, ref } from 'vue'
import AppButton from '../common/AppButton.vue'
import { confirmAction } from '../../api/confirm.js'

const props = defineProps({
  confirm: { type: Object, required: true },
})

const emit = defineEmits(['resolved'])
const processing = ref(false)
const error = ref('')
const status = ref(props.confirm.status || 'pending')

const request = computed(() => props.confirm.confirmRequest || {})
const reason = computed(() => request.value.reason || props.confirm.message || '确认执行此操作？')
const toolName = computed(() => request.value.toolName || props.confirm.confirmType || '')
const argsText = computed(() => {
  const args = request.value.arguments
  if (!args || typeof args !== 'object' || Object.keys(args).length === 0) return ''
  return JSON.stringify(args, null, 2)
})
const statusLabel = computed(() => {
  const labels = {
    pending: '待确认',
    approved: '已批准',
    executed: '已执行',
    rejected: '已拒绝',
    failed: '执行失败',
  }
  return labels[status.value] || status.value
})

async function act(decision) {
  if (processing.value || status.value !== 'pending') return
  processing.value = true
  error.value = ''
  try {
    const result = await confirmAction(props.confirm.id, decision)
    status.value = result.confirmation?.status || (decision === 'approve' ? 'executed' : 'rejected')
    emit('resolved', { id: props.confirm.id, decision, status: status.value })
  } catch (e) {
    error.value = e.message || '操作失败'
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div class="confirm-card">
    <div class="confirm-card-message">{{ reason }}</div>
    <div v-if="toolName" class="confirm-card-tool">工具：{{ toolName }}</div>
    <pre v-if="argsText" class="confirm-card-args">{{ argsText }}</pre>
    <div class="confirm-card-actions">
      <AppButton size="sm" :disabled="processing || status !== 'pending'" @click="act('approve')">确认</AppButton>
      <AppButton size="sm" variant="neutral" :disabled="processing || status !== 'pending'" @click="act('reject')"
        >拒绝</AppButton
      >
    </div>
    <div v-if="status !== 'pending'" class="confirm-card-status">{{ statusLabel }}</div>
    <div v-if="error" class="confirm-card-error">{{ error }}</div>
  </div>
</template>

<style scoped>
.confirm-card {
  border: 2px solid #000;
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-top: 0.5rem;
  background: #fffbe6;
}

.confirm-card-message {
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.confirm-card-tool {
  font-size: 0.7rem;
  font-weight: 700;
  color: #555;
  margin-bottom: 0.25rem;
}

.confirm-card-args {
  margin: 0 0 0.5rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.6);
  font-size: 0.7rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.confirm-card-actions {
  display: flex;
  gap: 0.5rem;
}

.confirm-card-error {
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: var(--nb-danger, #d32f2f);
}

.confirm-card-status {
  margin-top: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
}
</style>
