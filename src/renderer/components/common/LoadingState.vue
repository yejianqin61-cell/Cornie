<script setup>
import { Loader } from '@lucide/vue'

defineProps({
  text: { type: String, default: '' },
})
</script>

<template>
  <div class="loading-state" role="status">
    <Loader class="loading-icon" :size="24" />
    <p v-if="text" class="loading-text">{{ text }}</p>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 12px;
}

.loading-icon {
  color: var(--nb-text-secondary);
  animation: spin 1s linear infinite;
}

.loading-text {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--nb-text-secondary);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
