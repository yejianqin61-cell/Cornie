<script setup>
import { AlertTriangle, RotateCw } from '@lucide/vue'

defineProps({
  message: { type: String, required: true },
  onRetry: { type: Function, default: null },
})
</script>

<template>
  <div class="error-state" role="alert">
    <AlertTriangle class="error-icon" :size="36" />
    <p class="error-text">{{ message }}</p>
    <button v-if="onRetry" class="error-retry" @click="onRetry">
      <RotateCw :size="14" />
      <span>重试</span>
    </button>
  </div>
</template>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 12px;
}

.error-icon {
  color: var(--nb-danger);
}

.error-text {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--nb-text-secondary);
  text-align: center;
}

.error-retry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: var(--nb-border-width) solid var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-background);
  color: var(--nb-text);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 3px 3px 0 0 var(--nb-border);
}

.error-retry:hover {
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 0 var(--nb-border);
}
</style>
