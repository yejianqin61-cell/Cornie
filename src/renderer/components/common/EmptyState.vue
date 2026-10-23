<script setup>
defineProps({
  icon: { type: [Object, Function], required: true },
  text: { type: String, required: true },
})
</script>

<template>
  <div class="empty-state" role="status">
    <component :is="icon" class="empty-state-icon" :size="36" />
    <p class="empty-state-text">{{ text }}</p>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 12px;
}

.empty-state-icon {
  color: var(--nb-text-secondary);
}

.empty-state-text {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--nb-text-secondary);
}
</style>
