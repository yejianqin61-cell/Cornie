<script setup>
defineProps({
  fromVersion: { type: Object, default: () => ({}) },
  toVersion: { type: Object, default: () => ({}) },
  diff: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close'])
</script>

<template>
  <div class="mw-compare-overlay" @click.self="$emit('close')">
    <div class="mw-compare">
      <div class="mw-compare-header">
        <span class="mw-compare-title">版本对比</span>
        <span class="mw-compare-versions">
          {{ fromVersion.version }} → {{ toVersion.version }}
        </span>
      </div>
      <div class="mw-compare-body">
        <div class="mw-compare-section">
          <div class="mw-compare-label">{{ diff.summaryDiff || '摘要变更' }}</div>
          <div class="mw-compare-text">{{ diff.bodyDiff || diff.summaryDiff || '无差异' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mw-compare-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.mw-compare {
  background: var(--nb-background);
  border: 2px solid var(--nb-border);
  border-radius: 0.75rem;
  padding: 1.25rem;
  width: 640px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mw-compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mw-compare-title {
  font-weight: 700;
  font-size: 1rem;
}

.mw-compare-versions {
  font-size: 0.8rem;
  color: var(--nb-text-secondary);
}

.mw-compare-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mw-compare-section {
  border: 1.5px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.mw-compare-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--nb-text-secondary);
  margin-bottom: 0.5rem;
}

.mw-compare-text {
  font-size: 0.85rem;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>