<script setup>
import { Check, RotateCcw, Trash2 } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  view: { type: String, default: 'open' },
})

const emit = defineEmits(['complete', 'reopen', 'delete'])
</script>

<template>
  <div class="todo-list">
    <div v-for="item in items" :key="item.id" class="todo-item" :class="{ 'todo-item--done': item.completedAt }">
      <span class="todo-item-check" :class="{ 'todo-item-check--done': item.completedAt }" />
      <span class="todo-item-title">{{ item.title }}</span>
      <div class="todo-item-actions">
        <Button v-if="!item.completedAt" variant="neutral" size="icon" @click="$emit('complete', item.id)">
          <Check :size="14" />
        </Button>
        <Button v-if="item.completedAt" variant="neutral" size="icon" @click="$emit('reopen', item.id)">
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
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  transition: background 0.1s;
}

.todo-item:hover {
  background: var(--nb-hover);
}

.todo-item-check {
  width: 16px;
  height: 16px;
  border: 2px solid var(--nb-border);
  border-radius: 4px;
  flex-shrink: 0;
}

.todo-item-check--done {
  background: var(--nb-accent);
  border-color: var(--nb-accent);
}

.todo-item-title {
  flex: 1;
  font-size: 0.85rem;
}

.todo-item--done .todo-item-title {
  text-decoration: line-through;
  color: var(--nb-text-secondary);
}

.todo-item-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.1s;
}

.todo-item:hover .todo-item-actions {
  opacity: 1;
}
</style>