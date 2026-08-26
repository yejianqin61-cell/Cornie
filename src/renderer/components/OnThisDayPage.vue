<script setup>
import { onMounted, ref } from 'vue'
import { listOnThisDay } from '../api'
import CornieDiaryMarkdown from './CornieDiaryMarkdown.vue'
import UiButton from './ui/UiButton.vue'
import UiCard from './ui/UiCard.vue'
import UiEmpty from './ui/UiEmpty.vue'

function pad2(n) {
  return String(n).padStart(2, '0')
}
function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const date = ref(toISODate(new Date()))
const items = ref([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const data = await listOnThisDay(date.value, { limit: 20 })
    items.value = data.items || []
  } catch {
    /* ignore */
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="otdPage">
    <UiButton variant="ghost" class="backBtn" @click="$emit('back')">← 返回日记首页</UiButton>

    <div class="otdHeader">
      <div class="otdTitle">往年今日</div>
    </div>

    <div v-if="loading" class="otdStatus">加载中…</div>
    <UiEmpty v-else-if="items.length === 0" icon="📅" text="暂无记录" />
    <div v-else class="otdGrid">
      <UiCard v-for="it in items" :key="it.date" class="otdCard">
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
      </UiCard>
    </div>
  </div>
</template>

<style scoped>
.otdPage {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
.backBtn {
  align-self: flex-start;
}

.otdHeader {
  padding: 4px 0 0 0;
  text-align: center;
}
.otdTitle {
  font-size: var(--text-2xl);
  font-weight: 800;
}

.otdStatus {
  text-align: center;
  color: var(--muted);
  padding: 40px;
}

.otdGrid {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 2px;
}
.otdGrid::-webkit-scrollbar {
  width: 4px;
}
.otdGrid::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  border-radius: 999px;
}

.otdCard {
  padding: 16px;
}
.otdDate {
  font-weight: 700;
  margin-bottom: 10px;
}
.otdCols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.otdLabel {
  font-size: var(--text-sm);
  color: var(--muted);
  margin-bottom: 4px;
}
.otdText {
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: var(--text-md);
  max-height: 240px;
  overflow-y: auto;
}
.cornieText {
  white-space: normal;
  color: color-mix(in srgb, var(--color-accent) 45%, var(--color-text));
}
:deep(.cornieText .cornieMarkdown) {
  gap: 8px;
}
:deep(.cornieText .mdParagraph),
:deep(.cornieText .mdQuote),
:deep(.cornieText .mdList) {
  font-size: var(--text-md);
}

@media (max-width: 760px) {
  .otdCols {
    grid-template-columns: 1fr;
  }
}
</style>
