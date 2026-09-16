<script setup>
defineProps({
  links: { type: Array, default: () => [] },
})
</script>

<template>
  <div v-if="links.length > 0" class="obs-memory">
    <div class="obs-memory-header">关联记忆</div>
    <div v-for="link in links" :key="link.pageId" class="obs-memory-link">
      {{ link.title || link.pageId }}
    </div>
  </div>
</template>

<style scoped>
.obs-memory {
  border: 2px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--nb-background);
}

.obs-memory-header {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--nb-text-secondary);
  margin-bottom: 0.5rem;
}

.obs-memory-link {
  font-size: 0.85rem;
  padding: 0.25rem 0;
  color: var(--nb-accent);
  cursor: pointer;
}
</style>