<script setup>
import { ChevronDown, ChevronUp, MessageCircle } from '@lucide/vue'
import { Badge } from 'neobrutalism-vue'

defineProps({
  date: { type: String, required: true },
  summary: { type: String, default: '' },
  messageCount: { type: Number, default: 0 },
  expanded: { type: Boolean, default: false },
})

defineEmits(['toggle'])
</script>

<template>
  <div class="day-summary" :class="{ 'day-summary--expanded': expanded }">
    <button class="day-summary-bar" @click="$emit('toggle')">
      <div class="day-summary-left">
        <MessageCircle :size="14" />
        <span class="day-summary-date">{{ date }}</span>
        <Badge variant="outline">{{ messageCount }}</Badge>
      </div>
      <component :is="expanded ? ChevronUp : ChevronDown" :size="14" />
    </button>
    <div v-if="expanded" class="day-summary-content">
      <p class="day-summary-text">{{ summary }}</p>
    </div>
  </div>
</template>

<style scoped>
.day-summary {
  background: #fff;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 0 #000;
}

.day-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 14px;
  border: none;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.day-summary-bar:hover {
  background: #f8f5f0;
}

.day-summary-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.day-summary-date {
  font-weight: 900;
}

.day-summary-content {
  padding: 0 14px 14px;
  border-top: 2px solid #000;
}

.day-summary-text {
  margin: 12px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  line-height: 1.6;
}
</style>