<script setup>
import { XCircle, RotateCcw, Trash2 } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['cancel', 'restore', 'delete'])

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div class="sch-list">
    <div v-for="item in items" :key="item.id" class="sch-item" :class="{ 'sch-item--cancelled': item.cancelledAt }">
      <div class="sch-item-info">
        <span class="sch-item-title" :class="{ 'sch-item-title--cancelled': item.cancelledAt }">
          {{ item.title }}
        </span>
        <span class="sch-item-time">{{ formatTime(item.startAt) }}</span>
      </div>
      <div class="sch-item-actions">
        <Button v-if="!item.cancelledAt" variant="neutral" size="icon" @click="$emit('cancel', item.id)">
          <XCircle :size="14" />
        </Button>
        <Button v-if="item.cancelledAt" variant="neutral" size="icon" @click="$emit('restore', item.id)">
          <RotateCcw :size="14" />
        </Button>
        <Button variant="neutral" size="icon" @click="$emit('delete', item.id)">
          <Trash2 :size="14" />
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sch-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  transition: background 0.1s;
}

.sch-item:hover {
  background: var(--nb-hover);
}

.sch-item-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.sch-item-title {
  font-size: 0.85rem;
  font-weight: 600;
}

.sch-item-title--cancelled {
  text-decoration: line-through;
  color: var(--nb-text-secondary);
}

.sch-item-time {
  font-size: 0.75rem;
  color: var(--nb-text-secondary);
}

.sch-item-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.1s;
}

.sch-item:hover .sch-item-actions {
  opacity: 1;
}

.sch-item--cancelled {
  opacity: 0.6;
}
</style>