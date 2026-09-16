<script setup>
defineProps({
  sources: { type: Array, default: () => [] },
})
</script>

<template>
  <div v-if="sources.length > 0" class="mw-sources">
    <div class="mw-sources-header">来源追溯</div>
    <div v-for="(s, i) in sources" :key="i" class="mw-sources-item">
      <span class="mw-sources-label">{{ s.label || s.source || '未知来源' }}</span>
    </div>
  </div>
</template>

<style scoped>
.mw-sources {
  border: 2px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--nb-background);
}

.mw-sources-header {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--nb-text-secondary);
  margin-bottom: 0.5rem;
}

.mw-sources-item {
  font-size: 0.8rem;
  padding: 0.25rem 0;
  color: var(--nb-text-secondary);
  border-bottom: 1px solid var(--nb-border);
}

.mw-sources-item:last-child {
  border-bottom: none;
}

.mw-sources-label {
  color: var(--nb-text);
}
</style>