<script setup>
import { ArrowLeft, GitCompare, Pencil } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import MemoryWikiSourceRef from './MemoryWikiSourceRef.vue'
import MemoryWikiRelatedLinks from './MemoryWikiRelatedLinks.vue'

defineProps({
  page: { type: Object, required: true },
  versions: { type: Array, default: () => [] },
})

const emit = defineEmits(['back', 'edit', 'compare'])
</script>

<template>
  <div class="mw-detail">
    <div class="mw-detail-toolbar">
      <Button variant="neutral" size="icon" @click="$emit('back')">
        <ArrowLeft :size="16" />
      </Button>
      <div class="mw-detail-actions">
        <Button variant="neutral" size="sm" @click="$emit('edit')">
          <Pencil :size="14" />
          编辑
        </Button>
        <Button variant="neutral" size="sm" @click="$emit('compare')">
          <GitCompare :size="14" />
          历史
        </Button>
      </div>
    </div>

    <h2 class="mw-detail-title">{{ page.title }}</h2>

    <div class="mw-detail-meta">
      <span class="mw-detail-type">{{ page.pageType }}</span>
      <span v-if="page.status" class="mw-detail-status">{{ page.status }}</span>
    </div>

    <div class="mw-detail-summary">{{ page.summary || '' }}</div>

    <div class="mw-detail-body">{{ page.body || '' }}</div>

    <MemoryWikiSourceRef :sources="page.sources || []" />
    <MemoryWikiRelatedLinks :links="page.relatedLinks || []" />
  </div>
</template>

<style scoped>
.mw-detail {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
}

.mw-detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mw-detail-actions {
  display: flex;
  gap: 0.5rem;
}

.mw-detail-title {
  font-size: 1.3rem;
  font-weight: 800;
  line-height: 1.3;
}

.mw-detail-meta {
  display: flex;
  gap: 0.5rem;
}

.mw-detail-type {
  font-size: 0.7rem;
  padding: 2px 8px;
  border: 1.5px solid var(--nb-border);
  border-radius: 99px;
  color: var(--nb-text-secondary);
}

.mw-detail-status {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 99px;
  background: var(--nb-accent);
  color: var(--nb-accent-foreground);
}

.mw-detail-summary {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--nb-text-secondary);
  padding: 0.75rem;
  background: var(--nb-hover);
  border-radius: 0.5rem;
}

.mw-detail-body {
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-wrap;
  color: var(--nb-text);
}
</style>