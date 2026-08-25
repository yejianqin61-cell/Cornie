<script setup>
import UiCard from './ui/UiCard.vue'
import UiEmpty from './ui/UiEmpty.vue'

defineProps({
  topicItems: { type: Array, default: () => [] },
  selectedTopicKey: { type: String, default: '' },
  topicSourceTrace: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['select-topic', 'save-topic-aliases'])

// T-01：topicDetail 改为 v-model（defineModel），消除 props 直改。
const topicDetail = defineModel('topicDetail', { type: Object, default: null })
</script>

<template>
  <UiCard class="span2" title="Topic Index">
    <div class="topicGrid">
      <UiEmpty
        v-if="topicItems.length === 0"
        icon="🔗"
        text="现在还没有可用的主题索引。等记忆页面和聊天慢慢积累起来，这里就会帮你把关键词串起来。"
      />

      <div v-else class="topicList">
        <button
          v-for="item in topicItems"
          :key="item.normalizedKey"
          class="entryRow"
          :class="{ active: item.normalizedKey === selectedTopicKey }"
          @click="emit('select-topic', item.normalizedKey)"
        >
          <div>
            <div class="entryMain">{{ item.keyword || item.normalizedKey }}</div>
            <div class="entryMeta">heat {{ item.heatScore ?? 0 }} · {{ item.pageIds?.length || 0 }} pages</div>
          </div>
        </button>
      </div>

      <div class="topicDetail" v-if="topicDetail">
        <div class="detailTitle">{{ topicDetail.keyword || topicDetail.normalizedKey }}</div>
        <div class="detailMeta">索引键：{{ topicDetail.normalizedKey }}</div>
        <div class="detailMeta">主题热度：{{ topicDetail.heatScore ?? 0 }}</div>
        <div class="detailMeta">相关日期：{{ (topicDetail.dates || []).join(', ') || '无' }}</div>
        <div class="detailMeta">
          关联页面：{{ (topicDetail.pageIds || topicDetail.memoryPageIds || []).join(', ') || '无' }}
        </div>
        <div class="detailMeta">
          聊天来源：{{ (topicSourceTrace?.chatSources || []).map((item) => item.date).join(', ') || '无' }}
        </div>
        <div class="detailMeta">
          观察来源：{{ (topicSourceTrace?.observationSources || []).map((item) => item.title).join(', ') || '无' }}
        </div>
        <label class="topicAliases">
          <span>别名（逗号分隔）</span>
          <input v-model="topicDetail.aliasesText" />
        </label>
        <button class="primary" :disabled="saving" @click="emit('save-topic-aliases')">保存主题别名</button>
      </div>
      <UiEmpty v-else icon="🔍" text="点一个主题，我就把它的索引详情展开给主人看。" />
    </div>
  </UiCard>
</template>

<style scoped>
.span2 {
  grid-column: 1 / -1;
}
.topicGrid {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}
.topicList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}
.topicDetail {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
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
.detailTitle {
  font-weight: 800;
  font-size: 18px;
}
.detailMeta {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.topicAliases {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  font-size: 13px;
}
@media (max-width: 1120px) {
  .topicGrid {
    grid-template-columns: 1fr;
  }
}
</style>
