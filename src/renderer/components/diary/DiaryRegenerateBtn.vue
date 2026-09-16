<script setup>
import { BookOpen, Loader2 } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'

defineProps({
  date: { type: String, default: '' },
  regenerating: { type: Boolean, default: false },
})
</script>

<template>
  <div class="diary-regenerate">
    <BookOpen :size="32" class="diary-regenerate-icon" />
    <span class="diary-regenerate-text">Cornie 还未为这天写日记</span>
    <div class="diary-regenerate-action">
      <Button variant="neutral" size="sm" :disabled="regenerating" @click="$emit('regenerate')">
        <Loader2 v-if="regenerating" :size="12" class="spin" />
        {{ regenerating ? '生成中...' : '让 Cornie 写日记' }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.diary-regenerate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  border: 2px dashed var(--nb-border);
  border-radius: 0.75rem;
}

.diary-regenerate-icon {
  color: var(--nb-text-secondary);
}

.diary-regenerate-text {
  font-size: 0.85rem;
  color: var(--nb-text-secondary);
  font-weight: 600;
}

.diary-regenerate-action {
  display: flex;
  gap: 0.5rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>