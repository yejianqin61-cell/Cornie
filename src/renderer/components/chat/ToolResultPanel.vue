<script setup>
import { Wrench } from '@lucide/vue'

defineProps({
  results: { type: Array, default: () => [] },
})

function formatResult(result) {
  if (typeof result === 'string') return result
  if (result === undefined || result === null) return ''
  return JSON.stringify(result, null, 2)
}

function errorText(item) {
  return item.error?.message || item.error || '执行失败'
}
</script>

<template>
  <div v-if="results.length > 0" class="tool-results">
    <div v-for="(r, i) in results" :key="i" class="tool-result">
      <div class="tool-result-head">
        <Wrench :size="12" />
        <span class="tool-result-tool">{{ r.tool_name || '工具' }}</span>
      </div>
      <div class="tool-result-body">
        <pre v-if="r.ok" class="tool-result-data">{{ formatResult(r.result) }}</pre>
        <span v-else class="tool-result-error">{{ errorText(r) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.tool-result {
  border: 2px solid #000;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #fafafa;
}

.tool-result-head {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  background: #000;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
}

.tool-result-body {
  padding: 0.5rem 0.6rem;
}

.tool-result-data {
  font-size: 0.72rem;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  color: #555;
}

.tool-result-error {
  font-size: 0.72rem;
  color: var(--nb-danger, #d32f2f);
}
</style>
