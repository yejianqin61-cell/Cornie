<script setup>
import { ref } from 'vue'
import { Button } from 'neobrutalism-vue'
import { confirmAction } from '../../api/confirm.js'

const props = defineProps({
  confirm: { type: Object, required: true },
})

const emit = defineEmits(['resolved'])
const processing = ref(false)
const error = ref('')

async function act(action) {
  processing.value = true
  error.value = ''
  try {
    await confirmAction(props.confirm.id, action)
    emit('resolved', { id: props.confirm.id, action })
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
      <Button size="sm" :disabled="processing" @click="act('confirm')">确认</Button>
      <Button size="sm" variant="neutral" :disabled="processing" @click="act('deny')">拒绝</Button>
    </div>
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
</style>