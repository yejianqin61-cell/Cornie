<script setup>
const props = defineProps({
  results: {
    type: Array,
    default: () => [],
  },
})

function getToolLabel(name) {
  if (!name) return '这件小事'
  if (name.includes('ledger')) return '记账'
  if (name.includes('todo')) return '待办'
  if (name.includes('schedule')) return '日程'
  if (name.includes('category')) return '类目'
  if (name.includes('memory')) return '记忆'
  return '这件小事'
}

function getToolTitle(name) {
  if (!name) return '铃湾的处理结果'
  return name.replaceAll('_', ' ').replaceAll('-', ' ')
}

function getSummary(item) {
  if (item?.ok === false) {
    return item?.error || '这次没有顺利处理好'
  }
  if (typeof item?.summary === 'string' && item.summary.trim()) {
    return item.summary
  }
  if (typeof item?.message === 'string' && item.message.trim()) {
    return item.message
  }
  if (item?.result && typeof item.result === 'object') {
    if (typeof item.result.message === 'string' && item.result.message.trim()) {
      return item.result.message
    }
    if (typeof item.result.summary === 'string' && item.result.summary.trim()) {
      return item.result.summary
    }
  }
  return item?.ok === false ? '这次没有顺利处理好' : '已经帮你处理好了'
}

function getSourceText(item) {
  if (typeof item?.source_text === 'string' && item.source_text.trim()) {
    return item.source_text
  }
  if (typeof item?.sourceText === 'string' && item.sourceText.trim()) {
    return item.sourceText
  }
  return ''
}

function getCardTitle(item) {
  return item?.ok === false
    ? `铃湾刚刚处理 ${getToolLabel(item?.tool_name)} 时出了点小岔子`
    : `铃湾已经帮你处理好 ${getToolLabel(item?.tool_name)} 了`
}
</script>

<template>
  <div class="toolPanel">
    <div class="toolPanelIntro">已完成的操作</div>
    <div
      v-for="(item, index) in props.results"
      :key="`${item.tool_name || 'tool'}-${index}`"
      class="toolCard"
      :class="item?.ok === false ? 'toolCardError' : 'toolCardSuccess'"
    >
      <div class="toolHead">
        <div class="toolHeadMain">
          <div class="toolIcon">{{ item?.ok === false ? '!' : '✓' }}</div>
          <div class="toolHeadText">
            <div class="toolLabel">{{ getCardTitle(item) }}</div>
            <div class="toolName">{{ getToolTitle(item.tool_name) }}</div>
          </div>
        </div>
        <div class="toolBadge">{{ item?.ok === false ? '失败' : '完成' }}</div>
      </div>
      <div class="toolSummary">{{ getSummary(item) }}</div>
      <div v-if="getSourceText(item)" class="toolSource">你刚才说的是：{{ getSourceText(item) }}</div>
    </div>
  </div>
</template>

<style scoped>
.toolPanel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolPanelIntro {
  font-size: var(--text-sm);
  color: var(--muted);
  padding-left: 4px;
}

.toolCard {
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  background: var(--surface);
}

.toolCardSuccess {
  background: var(--success-soft);
}

.toolCardError {
  background: var(--danger-soft);
}

.toolHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.toolHeadMain {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.toolIcon {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: 700;
  flex: 0 0 auto;
  color: var(--text);
  background: var(--surface);
}

.toolHeadText {
  min-width: 0;
}

.toolLabel {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text);
  line-height: 1.5;
}

.toolName {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--muted);
}

.toolBadge {
  flex: 0 0 auto;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: var(--text-xs);
  color: var(--text);
  background: var(--surface);
  white-space: nowrap;
}

.toolSummary {
  margin-top: 6px;
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.toolSource {
  margin-top: 6px;
  font-size: var(--text-xs);
  color: var(--muted);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
