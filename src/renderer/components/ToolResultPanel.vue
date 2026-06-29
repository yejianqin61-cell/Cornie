<script setup>
const props = defineProps({
  results: {
    type: Array,
    default: () => []
  }
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
    <div class="toolPanelIntro">这轮对话里，铃湾已经动手帮你做了这些事</div>
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
        <div class="toolBadge">{{ item?.ok === false ? '这次没办成' : '已经写好了' }}</div>
      </div>
      <div class="toolSummary">{{ getSummary(item) }}</div>
      <div v-if="getSourceText(item)" class="toolSource">你刚才说的是：{{ getSourceText(item) }}</div>
    </div>
  </div>
</template>

<style scoped>
.toolPanel{
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolPanelIntro{
  font-size: 12px;
  color: var(--muted);
  padding-left: 4px;
}

.toolCard{
  border-radius: 16px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  background: var(--surface);
}

.toolCardSuccess{
  border-color: rgba(91,154,107,.22);
  background: var(--success-soft);
}

.toolCardError{
  border-color: rgba(217,106,92,.22);
  background: var(--danger-soft);
}

.toolHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.toolHeadMain{
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.toolIcon{
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex: 0 0 auto;
  color: var(--text);
  background: rgba(255,255,255,.72);
}

.toolHeadText{
  min-width: 0;
}

.toolLabel{
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.5;
}

.toolName{
  margin-top: 2px;
  font-size: 11px;
  color: var(--muted);
}

.toolBadge{
  flex: 0 0 auto;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 10px;
  color: var(--text);
  background: rgba(255,255,255,.78);
  border: 1px solid rgba(0,0,0,.06);
  white-space: nowrap;
}

.toolSummary{
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
}

.toolSource{
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
