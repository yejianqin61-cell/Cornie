<script setup>
import { Brain } from '@lucide/vue'
import { Badge } from 'neobrutalism-vue'

defineProps({
  memories: { type: Array, default: () => [] },
})
</script>

<template>
  <div v-if="memories.length" class="memory-hint">
    <div class="memory-hint-bar">
      <Brain :size="14" />
      <span>引用了 {{ memories.length }} 条记忆</span>
    </div>
    <div class="memory-hint-list">
      <div
        v-for="(mem, i) in memories"
        :key="i"
        class="memory-hint-item"
      >
        <span class="memory-hint-title">{{ mem.title }}</span>
        <span class="memory-hint-source">{{ mem.source }}</span>
        <p class="memory-hint-snippet">{{ mem.snippet }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.memory-hint {
  background: #f5f0ff;
  border: 2px solid #000;
  box-shadow: 3px 3px 0 0 #000;
  margin-bottom: 8px;
}

.memory-hint-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  color: #6b4d9a;
  border-bottom: 2px solid #000;
}

.memory-hint-list {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.memory-hint-item {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: baseline;
}

.memory-hint-title {
  font-size: 12px;
  font-weight: 900;
}

.memory-hint-source {
  font-size: 10px;
  font-weight: 600;
  color: #999;
}

.memory-hint-snippet {
  margin: 0;
  width: 100%;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  line-height: 1.4;
}
</style>