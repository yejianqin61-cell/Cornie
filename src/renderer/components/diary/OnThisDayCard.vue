<script setup>
defineProps({
  item: { type: Object, required: true },
})
</script>

<template>
  <div class="on-this-day">
    <div class="on-this-day-year">{{ item.year }}年</div>
    <div class="on-this-day-preview">{{ item.preview || item.cornieText || item.userText }}</div>
  </div>
</template>

<style scoped>
.on-this-day {
  border: 2px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--nb-background);
  transition: border-color 0.15s;
}

.on-this-day:hover {
  border-color: var(--nb-accent);
}

.on-this-day-year {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--nb-accent);
  margin-bottom: 0.25rem;
}

.on-this-day-preview {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--nb-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>