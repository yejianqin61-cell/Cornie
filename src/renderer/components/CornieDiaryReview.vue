<script setup>
import { onMounted, ref } from 'vue'
import { listEntries, getEntry } from '../api'
import CornieDiaryMarkdown from './CornieDiaryMarkdown.vue'

function pad2(n) { return String(n).padStart(2, '0') }
function toISOMonth(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}` }

const selectedMonth = ref(toISOMonth(new Date()))
const entries = ref([])
const loading = ref(false)
const activeDate = ref('')
const activeEntry = ref(null)
const detailLoading = ref(false)

async function refresh() {
  loading.value = true
  try {
    const data = await listEntries({ month: selectedMonth.value })
    entries.value = data.entries.filter((e) => e.hasCornieText)
    if (activeDate.value && !entries.value.some((item) => item.date === activeDate.value)) {
      activeDate.value = ''
      activeEntry.value = null
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function openEntry(date) {
  if (!date || detailLoading.value) return
  detailLoading.value = true
  try {
    const data = await getEntry(date)
    activeDate.value = date
    activeEntry.value = data?.entry || null
  } catch {
    activeDate.value = date
    activeEntry.value = {
      cornieText: '这篇日记翻出来的时候有点小打结了，等铃湾缓一缓再陪你看。'
    }
  } finally {
    detailLoading.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <div class="review">
    <header class="reviewHead">
      <button class="ghost" @click="$emit('back')">← 返回日记首页</button>
      <div>
        <div class="reviewTitle">铃湾的日记</div>
        <div class="reviewHint">铃湾为你写的每一篇日记</div>
      </div>
      <input class="monthInput" type="month" v-model="selectedMonth" @change="refresh" />
    </header>

    <div v-if="loading" class="reviewLoading">翻翻日记…</div>
    <div v-else-if="entries.length === 0" class="reviewEmpty">
      这个月铃湾还没开始写日记呢，去和她说说话吧。
    </div>
    <div v-else class="reviewList">
      <button
        v-for="e in entries"
        :key="e.date"
        class="reviewCard card"
        :class="{ active: activeDate === e.date }"
        type="button"
        @click="openEntry(e.date)"
      >
        <div class="reviewDate">{{ e.date }}</div>
        <div class="reviewExcerpt">
          <CornieDiaryMarkdown :content="e.cornieText || '铃湾那天没有留下文字。'" />
        </div>
      </button>
    </div>

    <div v-if="activeEntry?.cornieText || detailLoading" class="reviewDetail card">
      <div class="reviewDetailHead">
        <div>
          <div class="reviewDetailTitle">{{ activeDate || '铃湾日记' }}</div>
          <div class="reviewDetailHint">这一篇会按铃湾真正写下来的样子排版给你看。</div>
        </div>
      </div>
      <div v-if="detailLoading" class="reviewLoading inline">铃湾正在把这一页翻开给你看…</div>
      <div v-else class="reviewDetailBody">
        <CornieDiaryMarkdown :content="activeEntry?.cornieText || ''" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.review{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
.reviewHead{
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}
.reviewTitle{ font-size: 18px; font-weight: 800; }
.reviewHint{ font-size: 12px; color: var(--muted); margin-top: 2px; }
.monthInput{ margin-left: auto; width: 140px; }

.reviewList{
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
}
.reviewList::-webkit-scrollbar{ width: 4px; }
.reviewList::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.reviewCard{
  padding: 16px;
  text-align: left;
  background: var(--surface);
  cursor: pointer;
}
.reviewCard.active{
  border-color: rgba(155, 107, 122, 0.28);
  box-shadow: 0 10px 24px rgba(155, 107, 122, 0.08);
}
.reviewDate{ font-weight: 700; margin-bottom: 6px; }
.reviewExcerpt{
  font-size: 13px;
  color: #9B6B7A;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
:deep(.reviewExcerpt .cornieMarkdown){ gap: 6px; }
:deep(.reviewExcerpt .mdParagraph),
:deep(.reviewExcerpt .mdQuote),
:deep(.reviewExcerpt .mdList){
  font-size: 13px;
}

.reviewDetail{
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.reviewDetailHead{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.reviewDetailTitle{
  font-size: 17px;
  font-weight: 800;
}
.reviewDetailHint{
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}
.reviewDetailBody{
  color: #9B6B7A;
  line-height: 1.8;
}

.reviewLoading{ text-align: center; color: var(--muted); padding: 40px; }
.reviewLoading.inline{ padding: 10px 0; text-align: left; }
.reviewEmpty{
  text-align: center;
  color: var(--muted);
  padding: 40px;
  border: 1px dashed var(--border);
  border-radius: 14px;
}
</style>
