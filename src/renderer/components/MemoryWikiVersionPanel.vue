<script setup>
import UiCard from './ui/UiCard.vue'
import UiEmpty from './ui/UiEmpty.vue'

defineProps({
  pageId: { type: String, default: '' },
  pageVersions: { type: Array, default: () => [] },
  selectedVersionId: { type: String, default: '' },
  selectedVersion: { type: Object, default: null },
  versionDiff: { type: Object, default: null },
})

const emit = defineEmits(['select-version'])
</script>

<template>
  <UiCard class="span2" title="版本历史与回滚">
    <UiEmpty v-if="!pageId" icon="📚" text="先从左边选中一个记忆页面，我就把这页的版本历史整理给你看。" />

    <div v-else class="versionGrid">
      <UiEmpty v-if="pageVersions.length === 0" icon="🕐" text="这页目前还没有可用的历史版本记录。" />

      <div v-else class="versionList">
        <button
          v-for="item in pageVersions"
          :key="item.versionId"
          class="entryRow"
          :class="{ active: item.versionId === selectedVersionId }"
          @click="emit('select-version', item.versionId)"
        >
          <div>
            <div class="entryMain">{{ item.reason || 'snapshot' }}</div>
            <div class="entryMeta">{{ item.versionId }} · {{ item.createdAt || '未知时间' }}</div>
          </div>
        </button>
      </div>

      <div class="versionDetail">
        <div v-if="selectedVersion" class="governanceDetail">
          <div class="detailTitle">已选版本</div>
          <div class="detailMeta">版本 ID：{{ selectedVersion.versionId }}</div>
          <div class="detailMeta">快照原因：{{ selectedVersion.reason || 'snapshot' }}</div>
          <div class="detailMeta">创建时间：{{ selectedVersion.createdAt || '未知时间' }}</div>

          <div v-if="versionDiff" class="evidenceBlock">
            <div class="evidenceTitle">版本摘要</div>
            <div class="detailMeta">标题变更：{{ versionDiff.titleChanged ? '是' : '否' }}</div>
            <div class="detailMeta">摘要变更：{{ versionDiff.summaryChanged ? '是' : '否' }}</div>
            <div class="detailMeta">正文变更：{{ versionDiff.bodyChanged ? '是' : '否' }}</div>
            <div class="detailMeta">状态变更：{{ versionDiff.statusChanged ? '是' : '否' }}</div>
            <div class="detailMeta">重要性变更：{{ versionDiff.importanceChanged ? '是' : '否' }}</div>
            <pre class="evidenceItem">回滚后将把当前页面恢复到这个历史快照。</pre>
          </div>
        </div>
        <UiEmpty v-else icon="🕘" text="点左边某个版本，我就把这个版本的关键信息展开给你看。" />
      </div>
    </div>
  </UiCard>
</template>

<style scoped>
.span2 {
  grid-column: 1 / -1;
}
.versionGrid {
  display: grid;
  grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}
.versionList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}
.versionDetail {
  min-width: 0;
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
.detailMeta {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
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
@media (max-width: 1120px) {
  .versionGrid {
    grid-template-columns: 1fr;
  }
}
</style>
