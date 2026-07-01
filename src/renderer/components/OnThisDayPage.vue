<script setup>
import { onMounted, ref } from 'vue'
import { listOnThisDay } from '../api'
import CornieDiaryMarkdown from './CornieDiaryMarkdown.vue'

function pad2(n) { return String(n).padStart(2, '0') }
function toISODate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }

const date = ref(toISODate(new Date()))
const items = ref([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const data = await listOnThisDay(date.value, { limit: 20 })
    items.value = data.items || []
  } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<template>
  <div class="otdPage">
    <button class="ghost backBtn" @click="$emit('back')">← 返回日记首页</button>

    <div class="otdHeader card">
      <div class="otdTitle">往年今日</div>
      <div class="otdHint">回顾过去几年的今天</div>
    </div>

    <div v-if="loading" class="otdStatus">翻翻回忆…</div>
    <div v-else-if="items.length === 0" class="otdStatus empty">
      那时候我还没出生呢，不过现在我在了。
    </div>
    <div v-else class="otdGrid">
      <div v-for="it in items" :key="it.date" class="otdCard card">
        <div class="otdDate">{{ it.date }}</div>
        <div class="otdCols">
          <div class="otdCol">
            <div class="otdLabel">我的日记</div>
            <div class="otdText">{{ it.userText || '（空）' }}</div>
          </div>
          <div class="otdCol">
            <div class="otdLabel">Cornie 日记</div>
            <div v-if="it.cornieText" class="otdText cornieText">
              <CornieDiaryMarkdown :content="it.cornieText" />
            </div>
            <div v-else class="otdText">（空）</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.otdPage{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
.backBtn{ align-self: flex-start; }

.otdHeader{
  padding: 18px 20px;
  text-align: center;
}
.otdTitle{ font-size: 20px; font-weight: 800; }
.otdHint{ font-size: 13px; color: var(--muted); margin-top: 4px; }

.otdStatus{
  text-align: center;
  color: var(--muted);
  padding: 40px;
}
.otdStatus.empty{
  border: 1px dashed var(--border);
  border-radius: 14px;
}

.otdGrid{
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 2px;
}
.otdGrid::-webkit-scrollbar{ width: 4px; }
.otdGrid::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.otdCard{ padding: 16px; }
.otdDate{ font-weight: 700; margin-bottom: 10px; }
.otdCols{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.otdLabel{ font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.otdText{ white-space: pre-wrap; line-height: 1.5; font-size: 14px; max-height: 240px; overflow-y: auto; }
.cornieText{ white-space: normal; color: #9B6B7A; }
:deep(.cornieText .cornieMarkdown){ gap: 8px; }
:deep(.cornieText .mdParagraph),
:deep(.cornieText .mdQuote),
:deep(.cornieText .mdList){
  font-size: 14px;
}

@media (max-width: 760px){
  .otdCols{ grid-template-columns: 1fr; }
}
</style>
