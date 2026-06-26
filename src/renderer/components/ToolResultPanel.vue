<script setup>
const props = defineProps({
  results: {
    type: Array,
    default: () => []
  }
})

function getToolTitle(name) {
  if (!name) return '工具调用'
  return name.replaceAll('_', ' ')
}

function getSummary(item) {
  if (item?.ok === false) {
    return item?.error || '执行失败'
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
  return item?.ok === false ? '执行失败' : '执行完成'
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
</script>

<template>
  <div class="toolPanel">
    <div
      v-for="(item, index) in props.results"
      :key="`${item.tool_name || 'tool'}-${index}`"
      class="toolCard"
      :class="item?.ok === false ? 'toolCardError' : 'toolCardSuccess'"
    >
      <div class="toolHead">
        <div class="toolName">{{ getToolTitle(item.tool_name) }}</div>
        <div class="toolBadge">{{ item?.ok === false ? '失败' : '完成' }}</div>
      </div>
      <div class="toolSummary">{{ getSummary(item) }}</div>
      <div v-if="getSourceText(item)" class="toolSource">来源：{{ getSourceText(item) }}</div>
    </div>
  </div>
</template>

<style scoped>
.toolPanel{
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolCard{
  border-radius: 14px;
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.06);
}

.toolCardSuccess{
  box-shadow: inset 0 0 0 1px rgba(74,222,128,.12);
}

.toolCardError{
  border-color: rgba(248,113,113,.28);
  background: rgba(127,29,29,.22);
}

.toolHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.toolName{
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,.92);
}

.toolBadge{
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  color: rgba(255,255,255,.72);
  background: rgba(255,255,255,.08);
}

.toolSummary{
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(243,244,246,.9);
  white-space: pre-wrap;
  word-break: break-word;
}

.toolSource{
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255,255,255,.48);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
