<script setup>
import { nextTick, watch } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import AppButton from '../common/AppButton.vue'

const props = defineProps({
  days: { type: Array, default: () => [] },
  selected: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  prevDisabled: { type: Boolean, default: false },
  nextDisabled: { type: Boolean, default: false },
  months: { type: Array, default: () => [] },
  selectedMonth: { type: String, default: '' },
  isToday: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'prev', 'next', 'month', 'today'])

const chipRefs = new Map()

function setChipRef(date, element) {
  if (element) chipRefs.set(date, element)
  else chipRefs.delete(date)
}

async function scrollSelectedIntoView() {
  await nextTick()
  const element = chipRefs.get(props.selected)
  element?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
}

watch(() => props.selected, scrollSelectedIntoView, { immediate: true })
</script>

<template>
  <div class="chat-date-nav">
    <AppButton
      size="icon"
      variant="neutral"
      aria-label="前一天"
      :disabled="loading || prevDisabled"
      @click="emit('prev')"
    >
      <ChevronLeft :size="14" />
    </AppButton>
    <div class="chat-date-nav-actions">
      <select
        class="chat-date-nav-month"
        aria-label="按月份筛选"
        :value="selectedMonth"
        :disabled="loading"
        @change="emit('month', $event.target.value)"
      >
        <option value="">全部月份</option>
        <option v-for="month in months" :key="month" :value="month">{{ month }}</option>
      </select>
      <AppButton size="sm" variant="neutral" aria-label="回到今天" :disabled="loading || isToday" @click="emit('today')"
        >今天</AppButton
      >
    </div>
    <div class="chat-date-nav-list">
      <button
        v-for="d in days"
        :key="d.date"
        :ref="(element) => setChipRef(d.date, element)"
        class="chat-date-nav-item"
        :class="{ 'chat-date-nav-item--active': d.date === selected }"
        :aria-current="d.date === selected ? 'date' : undefined"
        :disabled="loading"
        @click="emit('select', d.date)"
      >
        {{ d.label }}
      </button>
    </div>
    <AppButton
      size="icon"
      variant="neutral"
      aria-label="后一天"
      :disabled="loading || nextDisabled"
      @click="emit('next')"
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
  border-bottom: var(--nb-border-width) solid var(--nb-border);
  background: var(--nb-background);
  overflow-x: auto;
}

.chat-date-nav-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.chat-date-nav-month {
  border: 2px solid var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-background);
  color: var(--nb-text);
  padding: 0.2rem 0.35rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
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
  border-radius: var(--nb-radius);
  background: var(--nb-background);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;
}

.chat-date-nav-item--active {
  background: var(--nb-accent);
  border-color: var(--nb-border);
}

.chat-date-nav-item:hover:not(:disabled) {
  background: var(--nb-hover);
}
</style>
