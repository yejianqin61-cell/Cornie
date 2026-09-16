<script setup>
defineProps({
  links: { type: Array, default: () => [] },
})
</script>

<template>
  <div v-if="links.length > 0" class="mw-related">
    <div class="mw-related-header">相关页面</div>
    <div v-for="link in links" :key="link.pageId || link.id" class="mw-related-item">
      {{ link.title || link.pageId }}
    </div>
  </div>
</template>

<style scoped>
.mw-related {
  border: 2px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--nb-background);
}

.mw-related-header {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--nb-text-secondary);
  margin-bottom: 0.5rem;
}

.mw-related-item {
  font-size: 0.85rem;
  padding: 0.25rem 0;
  color: var(--nb-accent);
  cursor: pointer;
}
</style>