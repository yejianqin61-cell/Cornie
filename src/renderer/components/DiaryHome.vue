<script setup>
import { computed, onMounted, ref } from 'vue'
import { getEntry, listOnThisDay, listObservations } from '../api'
import CornieDiaryMarkdown from './CornieDiaryMarkdown.vue'
import UiButton from './ui/UiButton.vue'
import UiCard from './ui/UiCard.vue'

function pad2(n) {
  return String(n).padStart(2, '0')
}
function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const today = new Date()
const todayStr = toISODate(today)

const entry = ref({ userText: '', cornieText: '' })
const onThisDayItems = ref([])
const todayObservations = ref([])
const loadingOtd = ref(false)

const hasWritten = computed(() => entry.value.userText?.trim().length > 0)
const hasCornieWritten = computed(() => entry.value.cornieText?.trim().length > 0)

onMounted(async () => {
  try {
    const data = await getEntry(todayStr)
    entry.value = data.entry
  } catch {
    /* ignore */
  }

  loadingOtd.value = true
  try {
    const data = await listOnThisDay(todayStr, { limit: 10 })
    onThisDayItems.value = data.items || []
  } catch {
    /* ignore */
  } finally {
    loadingOtd.value = false
  }

  // R-08：当天观察联动
  try {
    const data = await listObservations({ date: todayStr, limit: 3 })
    todayObservations.value = data?.observations || []
  } catch {
    /* ignore */
  }
})
</script>

<template>
  <div class="diaryPage">
    <!-- 今天卡片 -->
    <UiCard class="todayCard">
      <div class="todayDate">{{ todayStr }}</div>
      <div class="todayStatus">
        <span v-if="!hasWritten && !hasCornieWritten">还没有任何记录</span>
        <span v-if="hasWritten">✏️ 你写了一点</span>
        <span v-if="hasCornieWritten">🌸 铃湾也写了一篇</span>
      </div>
      <div class="todayActions">
        <UiButton variant="default" @click="$emit('go', 'editor')">写日记</UiButton>
        <UiButton variant="outline" @click="$emit('go', 'cornie-review')">查看铃湾日记</UiButton>
      </div>
    </UiCard>

    <!-- 双栏日记预览 -->
    <div class="previewGrid">
      <UiCard class="previewCard" :class="{ emptyPreview: !hasWritten }">
        <div class="previewTitle">✏️ 我今天写的</div>
        <div class="previewText" v-if="hasWritten">{{ entry.userText }}</div>
        <div class="previewHint" v-else>还没写</div>
      </UiCard>
      <UiCard class="previewCard" :class="{ emptyPreview: !hasCornieWritten }">
        <div class="previewTitle">🌸 铃湾今天写的</div>
        <div class="previewText corniePreview" v-if="hasCornieWritten">
          <CornieDiaryMarkdown :content="entry.cornieText" />
        </div>
        <div class="previewHint" v-else>铃湾还没写今天的日记。</div>
      </UiCard>
    </div>

    <!-- R-08：当天观察联动 -->
    <UiCard class="todayObsCard">
      <div class="todayObsHead">
        <div class="todayObsTitle">今天的观察</div>
        <UiButton variant="ghost" @click="$emit('go-observe')">看全部观察</UiButton>
      </div>
      <div v-if="todayObservations.length === 0" class="todayObsEmpty">今天还没有观察。</div>
      <div v-else class="todayObsList">
        <div v-for="item in todayObservations.slice(0, 3)" :key="item.id" class="todayObsItem">
          <div class="todayObsItemTitle">{{ item.title }}</div>
          <div class="todayObsItemSnippet">{{ (item.content || '').slice(0, 50) }}</div>
        </div>
      </div>
    </UiCard>

    <!-- 往年今日入口 -->
    <UiCard class="otdCard">
      <div class="otdHead">
        <div class="otdTitle">往年今日</div>
        <UiButton variant="ghost" @click="$emit('go', 'on-this-day')">查看全部</UiButton>
      </div>
      <div v-if="loadingOtd" class="otdLoading">加载中…</div>
      <div v-else-if="onThisDayItems.length === 0" class="otdEmpty">暂无记录</div>
      <div v-else class="otdList">
        <div v-for="it in onThisDayItems.slice(0, 3)" :key="it.date" class="otdItem">
          <div class="otdDate">{{ it.date }}</div>
          <div class="otdSnippet">{{ (it.userText || it.cornieText || '').slice(0, 60) }}…</div>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<style scoped>
.diaryPage {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}
.diaryPage::-webkit-scrollbar {
  width: 4px;
}
.diaryPage::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  border-radius: 999px;
}

/* ─── 今天卡片 ─── */
.todayCard {
  background: var(--diary-tint);
  padding: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.todayDate {
  font-size: var(--text-2xl);
  font-weight: 800;
}
.todayStatus {
  display: flex;
  gap: 12px;
  font-size: var(--text-base);
  color: var(--muted);
}
.todayActions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

/* ─── 双栏预览 ─── */
.previewGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.previewCard {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.previewTitle {
  font-weight: 700;
  font-size: var(--text-md);
}
.previewText {
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: var(--text-base);
  max-height: 160px;
  overflow-y: auto;
}
.corniePreview {
  white-space: normal;
  color: color-mix(in srgb, var(--color-accent) 45%, var(--color-text));
}
:deep(.corniePreview .cornieMarkdown) {
  gap: 8px;
}
:deep(.corniePreview .mdParagraph),
:deep(.corniePreview .mdQuote),
:deep(.corniePreview .mdList) {
  font-size: var(--text-base);
}
.emptyPreview {
  opacity: 0.65;
  background: var(--surface-2);
}
.previewHint {
  color: var(--muted);
  font-size: var(--text-base);
}

@media (max-width: 760px) {
  .previewGrid {
    grid-template-columns: 1fr;
  }
}

/* ─── 当天观察（R-08） ─── */
.todayObsCard {
  padding: 16px 20px;
}
.todayObsHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.todayObsTitle {
  font-weight: 700;
}
.todayObsEmpty {
  color: var(--muted);
  font-size: var(--text-base);
}
.todayObsList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.todayObsItem {
  padding: 10px 0;
}
.todayObsItemTitle {
  font-weight: 600;
  font-size: var(--text-base);
}
.todayObsItemSnippet {
  font-size: var(--text-sm);
  color: var(--muted);
  margin-top: 2px;
}

/* ─── 往年今日 ─── */
.otdCard {
  padding: 16px 20px;
}
.otdHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.otdTitle {
  font-weight: 700;
}
.otdLoading {
  color: var(--muted);
  font-size: var(--text-base);
}
.otdEmpty {
  color: var(--muted);
  font-size: var(--text-base);
  padding: 8px 0;
}
.otdList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.otdItem {
  padding: 10px 0;
}
.otdDate {
  font-weight: 700;
  font-size: var(--text-base);
  margin-bottom: 4px;
}
.otdSnippet {
  font-size: var(--text-base);
  color: var(--muted);
}
</style>
