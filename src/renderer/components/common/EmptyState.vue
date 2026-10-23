<script setup>
defineProps({
  icon: { type: Object, required: true },
  text: { type: String, required: true },
})
</script>

<template>
  <div class="empty-state">
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
  color: #999;
}

.empty-state-text {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #999;
}
</style>
