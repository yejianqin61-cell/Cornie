<script setup>
const props = defineProps({
  text: { type: String, default: '' },
})
</script>

<template>
  <div class="cornie-diary">
    <div class="cornie-diary-label">Cornie 的视角</div>
    <div class="cornie-diary-body">{{ text }}</div>
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
</style>