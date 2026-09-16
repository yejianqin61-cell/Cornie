<script setup>
defineProps({
  topic: { type: String, required: true },
  active: { type: Boolean, default: false },
})
</script>

<template>
  <span class="topic-chip" :class="{ 'topic-chip--active': active }">
    {{ topic }}
  </span>
</template>

<style scoped>
.topic-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 10px;
  border: 1.5px solid var(--nb-border);
  border-radius: 99px;
  color: var(--nb-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.topic-chip:hover {
  border-color: var(--nb-accent);
  color: var(--nb-accent);
}

.topic-chip--active {
  background: var(--nb-accent);
  color: var(--nb-accent-foreground);
  border-color: var(--nb-accent);
}
</style>