<script setup>
import UiCard from './ui/UiCard.vue'
import UiEmpty from './ui/UiEmpty.vue'

defineProps({
  pages: { type: Array, default: () => [] },
  selectedPageId: { type: String, default: '' },
  filterType: { type: String, default: '' },
  filterStatus: { type: String, default: '' },
})

const emit = defineEmits(['select-page', 'change', 'update:filterType', 'update:filterStatus'])

function handleTypeChange(event) {
  emit('update:filterType', event.target.value)
  emit('change')
}

function handleStatusChange(event) {
  emit('update:filterStatus', event.target.value)
  emit('change')
}
</script>

<template>
  <UiCard title="记忆页面">
    <template #actions>
      <div class="cardFilters">
        <select :value="filterType" @change="handleTypeChange">
          <option value="">全部类型</option>
          <option value="topic">topic</option>
          <option value="person">person</option>
          <option value="event">event</option>
          <option value="preference">preference</option>
          <option value="identity_profile">identity_profile</option>
          <option value="identity_person">identity_person</option>
          <option value="identity_preference">identity_preference</option>
          <option value="identity_trait">identity_trait</option>
        </select>
        <select :value="filterStatus" @change="handleStatusChange">
          <option value="">全部状态</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="archived">archived</option>
        </select>
      </div>
    </template>

    <UiEmpty v-if="pages.length === 0" icon="📄" text="暂无记忆页面" />

    <div v-else class="entryList">
      <button
        v-for="page in pages"
        :key="page.pageId"
        class="entryRow"
        :class="{ active: page.pageId === selectedPageId }"
        @click="emit('select-page', page.pageId)"
      >
        <div>
          <div class="entryMain">{{ page.title }}</div>
          <div class="entryMeta">{{ page.pageType }} · {{ page.status }} · {{ page.importance }}</div>
        </div>
      </button>
    </div>
  </UiCard>
</template>

<style scoped>
.cardFilters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.entryList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}
.entryRow {
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
}
.entryRow.active {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.entryMain {
  font-weight: 700;
}
.entryMeta {
  margin-top: 4px;
  font-size: var(--text-sm);
  color: var(--muted);
}
</style>
