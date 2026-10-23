<script setup>
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import AppButton from '../common/AppButton.vue'

defineProps({
  days: { type: Array, default: () => [] },
  selected: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  prevDisabled: { type: Boolean, default: false },
  nextDisabled: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'prev', 'next'])
</script>

<template>
  <div class="chat-date-nav">
    <AppButton
      size="icon"
      variant="neutral"
      aria-label="前一天"
      :disabled="loading || prevDisabled"
      @click="$emit('prev')"
    >
      <ChevronLeft :size="14" />
    </AppButton>
    <div class="chat-date-nav-list">
      <button
        v-for="d in days"
        :key="d.date"
        class="chat-date-nav-item"
        :class="{ 'chat-date-nav-item--active': d.date === selected }"
        :disabled="loading"
        @click="$emit('select', d.date)"
      >
        {{ d.label }}
      </button>
    </div>
    <AppButton
      size="icon"
      variant="neutral"
      aria-label="后一天"
      :disabled="loading || nextDisabled"
      @click="$emit('next')"
    >
      <ChevronRight :size="14" />
    </AppButton>
  </div>
</template>

<style scoped>
.chat-date-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border-bottom: 2px solid var(--nb-border);
  overflow-x: auto;
}

.chat-date-nav-list {
  display: flex;
  gap: 0.25rem;
  flex-wrap: nowrap;
}

.chat-date-nav-item {
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  border: 2px solid var(--nb-border);
  border-radius: 0.5rem;
  background: #fff;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;
}

.chat-date-nav-item--active {
  background: #ffd100;
  border-color: #000;
}

.chat-date-nav-item:hover:not(:disabled) {
  background: var(--nb-hover);
}
</style>
