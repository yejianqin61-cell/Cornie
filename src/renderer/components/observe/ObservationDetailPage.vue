<script setup>
import { ArrowLeft, Trash2 } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import ObservationLinkedMemory from './ObservationLinkedMemory.vue'

defineProps({
  observation: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['back', 'delete'])

const TYPE_LABELS = { note: '笔记', dream: '梦境', insight: '洞察', misc: '其他' }

function typeLabel(t) {
  return TYPE_LABELS[t] || t
}
</script>

<template>
  <div class="obs-detail">
    <div class="obs-detail-header">
      <Button variant="neutral" size="icon" @click="$emit('back')">
        <ArrowLeft :size="16" />
      </Button>
    </div>

    <div v-if="loading" class="obs-detail-skeleton">
      <div class="obs-detail-skeleton-line" />
      <div class="obs-detail-skeleton-line obs-detail-skeleton-line--short" />
      <div class="obs-detail-skeleton-line obs-detail-skeleton-line--long" />
      <div class="obs-detail-skeleton-line obs-detail-skeleton-line--long" />
    </div>

    <div v-else-if="error" class="obs-detail-error">
      <span>{{ error }}</span>
      <Button variant="neutral" size="sm" @click="$emit('back')">返回列表</Button>
    </div>

    <template v-else-if="observation">
      <div class="obs-detail-meta">
        <span class="obs-detail-type">{{ typeLabel(observation.type) }}</span>
        <span class="obs-detail-date">{{ observation.date }}</span>
      </div>
      <h2 class="obs-detail-title">{{ observation.title || '无标题' }}</h2>
      <div class="obs-detail-body">{{ observation.content || '' }}</div>
      <ObservationLinkedMemory :links="observation.memoryLinks || []" />
      <div class="obs-detail-actions">
        <Button variant="neutral" @click="$emit('delete')">
          <Trash2 :size="14" />
          删除
        </Button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.obs-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  height: 100%;
  overflow-y: auto;
}

.obs-detail-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.obs-detail-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.obs-detail-type {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border: 1.5px solid var(--nb-border);
  border-radius: 99px;
  color: var(--nb-text-secondary);
}

.obs-detail-date {
  font-size: 0.8rem;
  color: var(--nb-text-secondary);
  margin-left: auto;
}

.obs-detail-title {
  font-size: 1.2rem;
  font-weight: 800;
}

.obs-detail-body {
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-wrap;
  color: var(--nb-text);
}

.obs-detail-actions {
  display: flex;
  justify-content: flex-start;
  padding-top: 1rem;
  border-top: 1px solid var(--nb-border);
}

.obs-detail-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.obs-detail-skeleton-line {
  height: 1rem;
  border-radius: 0.25rem;
  background: var(--nb-border);
  animation: pulse 1.5s ease-in-out infinite;
}

.obs-detail-skeleton-line--short { width: 40%; }
.obs-detail-skeleton-line--long { width: 100%; }

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

.obs-detail-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border: 1.5px solid #fca5a5;
  border-radius: 0.5rem;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 0.85rem;
  font-weight: 600;
}
</style>