<script setup>
import UiCard from './ui/UiCard.vue'
import UiEmpty from './ui/UiEmpty.vue'

defineProps({
  detail: { type: Object, default: null },
  evidenceItems: { type: Array, default: () => [] },
  suggestedActions: { type: Array, default: () => [] },
  filterSummary: { type: String, default: '' },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['approve', 'defer', 'reject'])
</script>

<template>
  <UiCard title="治理详情">
    <div v-if="detail" class="governanceDetail">
      <div class="detailTitle">{{ detail.title || detail.requestType }}</div>
      <div class="detailBadgeRow">
        <span class="detailBadge">建议</span>
        <span class="detailBadge">{{ detail.status }}</span>
        <span class="detailBadge">{{ detail.riskLevel || 'unknown risk' }}</span>
      </div>
      <div class="detailMetaGrid">
        <div class="detailMetaCard">
          <div class="detailMetaLabel">状态</div>
          <div class="detailMetaValue">{{ detail.status }}</div>
        </div>
        <div class="detailMetaCard">
          <div class="detailMetaLabel">来源</div>
          <div class="detailMetaValue">{{ detail.triggerSource || 'unknown' }}</div>
        </div>
        <div class="detailMetaCard">
          <div class="detailMetaLabel">分区</div>
          <div class="detailMetaValue">{{ detail.queueSection || 'unknown' }}</div>
        </div>
        <div class="detailMetaCard">
          <div class="detailMetaLabel">页面</div>
          <div class="detailMetaValue">{{ (detail.pageIds || []).join(', ') || '无' }}</div>
        </div>
        <div class="detailMetaCard">
          <div class="detailMetaLabel">主题</div>
          <div class="detailMetaValue">{{ (detail.topicKeys || []).join(', ') || '无' }}</div>
        </div>
        <div class="detailMetaCard">
          <div class="detailMetaLabel">筛选视角</div>
          <div class="detailMetaValue">{{ filterSummary }}</div>
        </div>
      </div>

      <div class="detailSection">
        <div class="evidenceTitle">为什么建议这样处理</div>
        <div class="detailText">{{ detail.reason || '暂无原因说明' }}</div>
      </div>

      <div class="detailSection">
        <div class="evidenceTitle">建议动作</div>
        <div v-if="suggestedActions.length > 0" class="suggestionList">
          <div v-for="item in suggestedActions" :key="item" class="suggestionItem">{{ item }}</div>
        </div>
        <div v-else class="emptyInline">当前没有额外的建议动作参数。</div>
      </div>

      <div class="evidenceBlock">
        <div class="evidenceTitle">证据与依据</div>
        <div v-if="evidenceItems.length > 0" class="evidenceCards">
          <div v-for="item in evidenceItems" :key="item.id" class="evidenceCard">
            <div class="evidenceSummary">{{ item.summary }}</div>
            <pre class="evidenceItem">{{ item.body }}</pre>
          </div>
        </div>
        <div v-else class="emptyInline">这条治理建议当前没有附带更多证据。</div>
      </div>

      <div class="actionRow">
        <button class="primary" :disabled="saving || detail.status === 'approved'" @click="emit('approve')">
          标记已处理
        </button>
        <button :disabled="saving || detail.status === 'deferred'" @click="emit('defer')">稍后再看</button>
        <button :disabled="saving || detail.status === 'rejected'" @click="emit('reject')">驳回建议</button>
      </div>
    </div>
    <UiEmpty v-else icon="📋" text="点左边一条治理请求，我就把它的原因、证据和处理入口摊给你看。" />
  </UiCard>
</template>

<style scoped>
.governanceDetail {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
}
.detailTitle {
  font-weight: 800;
  font-size: 18px;
}
.detailBadgeRow {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.detailBadge {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
}
.detailMetaGrid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.detailMetaCard {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
}
.detailMetaLabel {
  font-size: 11px;
  color: var(--muted);
}
.detailMetaValue {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  overflow-wrap: anywhere;
}
.detailSection {
  margin-top: 14px;
}
.detailText {
  margin-top: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.suggestionList {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.suggestionItem {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.88);
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.evidenceBlock {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.evidenceTitle {
  font-size: 13px;
  font-weight: 700;
}
.evidenceCards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.evidenceCard {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px;
}
.evidenceSummary {
  font-size: 12px;
  font-weight: 700;
  color: rgba(248, 250, 252, 0.92);
  margin-bottom: 8px;
}
.evidenceItem {
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.55);
  color: rgba(226, 232, 240, 0.92);
  font-size: 12px;
  white-space: pre-wrap;
  overflow: auto;
}
.emptyInline {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.02);
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.actionRow {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
@media (max-width: 720px) {
  .detailMetaGrid {
    grid-template-columns: 1fr;
  }
}
</style>
