<script setup>
defineProps({
  observation: { type: Object, required: true },
})

const TYPE_LABELS = { note: '笔记', dream: '梦境', insight: '洞察', misc: '其他' }

function typeLabel(t) {
  return TYPE_LABELS[t] || t
}
</script>

<template>
  <div class="obs-card">
    <div class="obs-card-header">
      <span class="obs-card-date">{{ observation.date }}</span>
      <span class="obs-card-type">{{ typeLabel(observation.type) }}</span>
    </div>
    <div class="obs-card-title">{{ observation.title }}</div>
    <div class="obs-card-body">{{ observation.content?.slice(0, 120) || '' }}</div>
  </div>
</template>

<style scoped>
.obs-card {
  border: 2px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: border-color 0.15s;
  background: var(--nb-background);
}

.obs-card:hover {
  border-color: var(--nb-accent);
}

.obs-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.obs-card-date {
  font-size: 0.75rem;
  color: var(--nb-text-secondary);
}

.obs-card-type {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 8px;
  border: 1.5px solid var(--nb-border);
  border-radius: 99px;
  color: var(--nb-text-secondary);
}

.obs-card-title {
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.obs-card-body {
  font-size: 0.8rem;
  color: var(--nb-text-secondary);
  line-height: 1.4;
}
</style>