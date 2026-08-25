<script setup>
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
  <section class="workspaceCard">
    <div class="cardHead">
      <div>
        <div class="cardTitle">记忆页面</div>
      </div>
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
    </div>

    <div v-if="pages.length === 0" class="emptyState">
      这里暂时还没有记忆页面。等铃湾和主人慢慢把重要的人、事、偏好记下来，这里就会热闹起来。
    </div>

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
  </section>
</template>

<style scoped>
.workspaceCard {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.cardHead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.cardTitle {
  font-weight: 800;
  font-size: 16px;
}
.cardSubhint {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}
.cardFilters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.emptyState {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px dashed var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  line-height: 1.6;
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
  background: rgba(125, 211, 252, 0.12);
  border-color: rgba(125, 211, 252, 0.35);
}
.entryMain {
  font-weight: 700;
}
.entryMeta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}
@media (max-width: 720px) {
  .cardHead {
    flex-direction: column;
  }
}
</style>
