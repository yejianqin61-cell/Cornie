<script setup>
const props = defineProps({
  items: { type: Array, default: () => [] },
  activePageId: { type: String, default: '' },
})

const emit = defineEmits(['select'])

function groupByType(items) {
  const groups = {}
  for (const item of items) {
    const t = item.pageType || 'other'
    if (!groups[t]) groups[t] = []
    groups[t].push(item)
  }
  return groups
}

const grouped = groupByType(props.items)

const TYPE_LABELS = { person: '人物', place: '地点', event: '事件', concept: '概念', other: '其他' }
</script>

<template>
  <div class="mw-tree">
    <div v-for="(pages, type) in grouped" :key="type" class="mw-tree-group">
      <div class="mw-tree-group-header">{{ TYPE_LABELS[type] || type }}</div>
      <div
        v-for="page in pages"
        :key="page.pageId || page.id"
        class="mw-tree-item"
        :class="{ 'mw-tree-item--active': (page.pageId || page.id) === activePageId }"
        @click="$emit('select', page.pageId || page.id)"
      >
        <span class="mw-tree-item-title">{{ page.title }}</span>
        <span v-if="page.status === 'draft'" class="mw-tree-item-badge">草稿</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mw-tree {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mw-tree-group-header {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--nb-text-secondary);
  padding: 0.25rem 0.5rem;
}

.mw-tree-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.1s;
}

.mw-tree-item:hover {
  background: var(--nb-hover);
}

.mw-tree-item--active {
  background: var(--nb-accent);
  color: var(--nb-accent-foreground);
  font-weight: 600;
}

.mw-tree-item-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mw-tree-item-badge {
  font-size: 0.6rem;
  padding: 1px 6px;
  border-radius: 99px;
  background: var(--nb-border);
  color: var(--nb-text-secondary);
  flex-shrink: 0;
}
</style>