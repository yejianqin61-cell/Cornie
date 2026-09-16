<script setup>
defineProps({
  text: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
</script>

<template>
  <div class="cornie-diary">
    <div class="cornie-diary-label">Cornie 的视角</div>
    <div v-if="loading" class="cornie-diary-skeleton">
      <div class="cornie-diary-skeleton-line" v-for="n in 3" :key="n" />
    </div>
    <div v-else-if="error" class="cornie-diary-error">
      <span>{{ error }}</span>
    </div>
    <div v-else class="cornie-diary-body">{{ text || '等待 Cornie 书写...' }}</div>
  </div>
</template>

<style scoped>
.cornie-diary {
  border-left: 3px solid var(--nb-accent);
  padding: 0.75rem 1rem;
  background: var(--nb-background);
  border-radius: 0 0.5rem 0.5rem 0;
  min-height: 80px;
}

.cornie-diary-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--nb-text-secondary);
  margin-bottom: 0.5rem;
}

.cornie-diary-body {
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-wrap;
  color: var(--nb-text);
}

.cornie-diary-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cornie-diary-skeleton-line {
  height: 14px;
  border-radius: 0.25rem;
  background: var(--nb-border);
  animation: pulse 1.5s infinite;
}

.cornie-diary-skeleton-line:nth-child(1) { width: 90%; }
.cornie-diary-skeleton-line:nth-child(2) { width: 75%; }
.cornie-diary-skeleton-line:nth-child(3) { width: 50%; }

.cornie-diary-error {
  font-size: 0.8rem;
  color: var(--nb-danger, #d32f2f);
  font-weight: 600;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>