<script setup>
import { computed, onMounted, ref } from 'vue'
import { getEntry, listEntries, listOnThisDay } from '../api'

function pad2(n) { return String(n).padStart(2, '0') }
function toISODate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }

const today = new Date()
const todayStr = toISODate(today)

const entry = ref({ userText: '', cornieText: '' })
const onThisDayItems = ref([])
const loading = ref(false)
const loadingOtd = ref(false)

const hasWritten = computed(() => entry.value.userText?.trim().length > 0)
const hasCornieWritten = computed(() => entry.value.cornieText?.trim().length > 0)

const moodHint = computed(() => {
  if (hasWritten.value) return '今天已经记下了一点'
  return '今天发生了什么呢？'
})

onMounted(async () => {
  loading.value = true
  try {
    const data = await getEntry(todayStr)
    entry.value = data.entry
  } catch { /* ignore */ }
  finally { loading.value = false }

  loadingOtd.value = true
  try {
    const data = await listOnThisDay(todayStr, { limit: 10 })
    onThisDayItems.value = data.items || []
  } catch { /* ignore */ }
  finally { loadingOtd.value = false }
})

function emitGo(where) {
  // parent handles navigation
}
</script>

<template>
  <div class="diaryPage">
    <!-- 今天卡片 -->
    <div class="todayCard card">
      <div class="todayDate">{{ todayStr }}</div>
      <div class="todayMood">{{ moodHint }}</div>
      <div class="todayStatus">
        <span v-if="!hasWritten && !hasCornieWritten">还没有任何记录</span>
        <span v-if="hasWritten">✏️ 你写了一点</span>
        <span v-if="hasCornieWritten">🌸 铃湾也写了一篇</span>
      </div>
      <div class="todayActions">
        <button class="primary" @click="$emit('go', 'editor')">写日记</button>
        <button @click="$emit('go', 'cornie-review')">查看铃湾日记</button>
      </div>
    </div>

    <!-- 双栏日记预览 -->
    <div class="previewGrid">
      <div class="previewCard card" :class="{ emptyPreview: !hasWritten }">
        <div class="previewTitle">✏️ 我今天写的</div>
        <div class="previewText" v-if="hasWritten">{{ entry.userText }}</div>
        <div class="previewHint" v-else>还没写，点击上方写日记。</div>
      </div>
      <div class="previewCard card" :class="{ emptyPreview: !hasCornieWritten }">
        <div class="previewTitle">🌸 铃湾今天写的</div>
        <div class="previewText corniePreview" v-if="hasCornieWritten">{{ entry.cornieText }}</div>
        <div class="previewHint" v-else>铃湾还没写今天的日记。</div>
      </div>
    </div>

    <!-- 往年今日入口 -->
    <div class="otdCard card">
      <div class="otdHead">
        <div class="otdTitle">往年今日</div>
        <button class="ghost" @click="$emit('go', 'on-this-day')">查看全部</button>
      </div>
      <div v-if="loadingOtd" class="otdLoading">翻翻回忆…</div>
      <div v-else-if="onThisDayItems.length === 0" class="otdEmpty">
        那时候我还没出生呢，不过现在我在了。
      </div>
      <div v-else class="otdList">
        <div v-for="it in onThisDayItems.slice(0, 3)" :key="it.date" class="otdItem">
          <div class="otdDate">{{ it.date }}</div>
          <div class="otdSnippet">{{ (it.userText || it.cornieText || '').slice(0, 60) }}…</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diaryPage{
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}
.diaryPage::-webkit-scrollbar{ width: 4px; }
.diaryPage::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

/* ─── 今天卡片 ─── */
.todayCard{
  background: var(--diary-tint);
  padding: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.todayDate{ font-size: 22px; font-weight: 800; }
.todayMood{ font-size: 15px; color: var(--muted); }
.todayStatus{
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--muted);
}
.todayActions{
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

/* ─── 双栏预览 ─── */
.previewGrid{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.previewCard{
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.previewTitle{ font-weight: 700; font-size: 14px; }
.previewText{
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 13px;
  max-height: 160px;
  overflow-y: auto;
}
.corniePreview{ color: #9B6B7A; }
.emptyPreview{ opacity: .65; background: var(--surface-2); }
.previewHint{ color: var(--muted); font-size: 13px; }

@media (max-width: 760px){
  .previewGrid{ grid-template-columns: 1fr; }
}

/* ─── 往年今日 ─── */
.otdCard{ padding: 16px 20px; }
.otdHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.otdTitle{ font-weight: 700; }
.otdLoading{ color: var(--muted); font-size: 13px; }
.otdEmpty{
  color: var(--muted);
  font-size: 13px;
  padding: 8px 0;
}
.otdList{ display: flex; flex-direction: column; gap: 8px; }
.otdItem{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
}
.otdDate{ font-weight: 700; font-size: 13px; margin-bottom: 4px; }
.otdSnippet{ font-size: 13px; color: var(--muted); }
</style>
