<script setup>
defineProps({
  category: { type: String, required: true },
  color: { type: String, default: '#999' },
})
</script>

<template>
  <span class="cat-tag" :style="{ '--cat-color': color }">
    <span class="cat-tag-dot"></span>
    {{ category }}
  </span>
</template>

<style scoped>
.cat-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border: 2px solid #000;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.cat-tag-dot {
  width: 7px;
  height: 7px;
  background: var(--cat-color);
  border: 1px solid #000;
  flex-shrink: 0;
}
</style>