<script setup>
import { AlertTriangle, RotateCw } from '@lucide/vue'

defineProps({
  message: { type: String, required: true },
  onRetry: { type: Function, default: null },
})
</script>

<template>
  <div class="error-state">
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
  color: #d44;
}

.error-text {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #666;
  text-align: center;
}

.error-retry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 3px solid #000;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 3px 3px 0 0 #000;
}

.error-retry:hover {
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 0 #000;
}
</style>
