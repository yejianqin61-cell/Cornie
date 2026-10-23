<script setup>
import { ref } from 'vue'
import AppButton from '../common/AppButton.vue'
import { confirmAction } from '../../api/confirm.js'

const props = defineProps({
  confirm: { type: Object, required: true },
})

const emit = defineEmits(['resolved'])
const processing = ref(false)
const error = ref('')
const status = ref(props.confirm.status || 'pending')

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
    <div class="confirm-card-message">{{ confirm.message || '确认执行此操作？' }}</div>
    <div class="confirm-card-actions">
      <AppButton size="sm" :disabled="processing || status !== 'pending'" @click="act('approve')">确认</AppButton>
      <AppButton size="sm" variant="neutral" :disabled="processing || status !== 'pending'" @click="act('reject')"
        >拒绝</AppButton
      >
    </div>
    <div v-if="status !== 'pending'" class="confirm-card-status">{{ status === 'executed' ? '已执行' : '已拒绝' }}</div>
    <div v-if="error" class="confirm-card-error">{{ error }}</div>
  </div>
</template>

<style scoped>
.confirm-card {
  border: 2px solid var(--nb-accent);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-top: 0.5rem;
  background: #fffbe6;
}

.confirm-card-message {
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
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
