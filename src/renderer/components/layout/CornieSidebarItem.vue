<script setup>
import { MessageCircle, BookOpen, Brain, ScanEye, Receipt, CheckSquare, CalendarDays, Settings } from '@lucide/vue'

defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  active: { type: Boolean, default: false },
})

const iconMap = {
  chat: MessageCircle,
  diary: BookOpen,
  memory: Brain,
  observe: ScanEye,
  ledger: Receipt,
  todo: CheckSquare,
  schedule: CalendarDays,
  settings: Settings,
}
</script>

<template>
  <button class="nb-sidebar-item" :class="{ 'nb-sidebar-item--active': active }" :title="label">
    <component :is="iconMap[icon]" class="nb-sidebar-icon" :size="20" />
    <span class="nb-sidebar-label">{{ label }}</span>
  </button>
</template>

<style scoped>
.nb-sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-bottom: 3px solid #000;
  background: #fff;
  color: #1a1a1a;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}

.nb-sidebar-item:last-child {
  border-bottom: none;
}

.nb-sidebar-item:hover {
  background: #e8e0d8;
}

.nb-sidebar-item--active {
  background: #1a1a1a;
  color: #fff;
}

.nb-sidebar-item--active:hover {
  background: #333;
}

.nb-sidebar-icon {
  flex-shrink: 0;
}

.nb-sidebar-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
