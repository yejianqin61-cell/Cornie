<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="settings-section">
    <div class="settings-section-header">
      <span class="settings-section-title">{{ title }}</span>
      <span v-if="description" class="settings-section-desc">{{ description }}</span>
    </div>
    <div class="settings-section-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.settings-section {
  border: 2px solid var(--nb-border);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--nb-background);
}

.settings-section-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--nb-border);
}

.settings-section-title {
  font-weight: 700;
  font-size: 0.9rem;
}

.settings-section-desc {
  font-size: 0.75rem;
  color: var(--nb-text-secondary);
}

.settings-section-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>