<script setup>
import { onMounted, ref } from 'vue'
import { listEntries, getEntry } from '../api'
import CornieDiaryMarkdown from './CornieDiaryMarkdown.vue'
import UiButton from './ui/UiButton.vue'

function pad2(n) {
  return String(n).padStart(2, '0')
}
function toISOMonth(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

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
  } catch {
    /* ignore */
  } finally {
    loading.value = false
  }
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
      cornieText: '加载失败，请稍后再试',
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
      <UiButton variant="ghost" @click="$emit('back')">← 返回日记首页</UiButton>
      <div>
        <div class="reviewTitle">铃湾的日记</div>
      </div>
      <input class="monthInput" type="month" v-model="selectedMonth" @change="refresh" />
    </header>

    <div v-if="loading" class="reviewLoading">加载中…</div>
    <div v-else-if="entries.length === 0" class="reviewEmpty">这个月还没有日记</div>
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
          <CornieDiaryMarkdown :content="e.cornieText || '暂无内容'" :heading-level="0" />
        </div>
      </button>
    </div>

    <div v-if="activeEntry?.cornieText || detailLoading" class="reviewDetail card">
      <div class="reviewDetailHead">
        <div class="reviewDetailTitle">{{ activeDate || '铃湾日记' }}</div>
      </div>
      <div v-if="detailLoading" class="reviewLoading inline">加载中…</div>
      <div v-else class="reviewDetailBody">
        <CornieDiaryMarkdown :content="activeEntry?.cornieText || ''" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.review {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
.reviewHead {
  display: flex;
  align-items: center;
  gap: 14px;
}
.reviewTitle {
  font-size: var(--text-xl);
  font-weight: 800;
}
.monthInput {
  margin-left: auto;
  width: 140px;
}

.reviewList {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
}
.reviewList::-webkit-scrollbar {
  width: 4px;
}
.reviewList::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  border-radius: 999px;
}

.reviewCard {
  padding: 16px;
  text-align: left;
  background: var(--surface);
  cursor: pointer;
}
.reviewCard.active {
  box-shadow: var(--shadow-card);
}
.reviewDate {
  font-weight: 700;
  margin-bottom: 6px;
}
.reviewExcerpt {
  font-size: var(--text-base);
  color: color-mix(in srgb, var(--color-accent) 45%, var(--color-text));
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
:deep(.reviewExcerpt .cornieMarkdown) {
  gap: 6px;
}
:deep(.reviewExcerpt .mdParagraph),
:deep(.reviewExcerpt .mdQuote),
:deep(.reviewExcerpt .mdList) {
  font-size: var(--text-base);
}

.reviewDetail {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.reviewDetailTitle {
  font-size: var(--text-lg);
  font-weight: 800;
}
.reviewDetailBody {
  color: color-mix(in srgb, var(--color-accent) 45%, var(--color-text));
  line-height: 1.8;
}

.reviewLoading {
  text-align: center;
  color: var(--muted);
  padding: 40px;
}
.reviewLoading.inline {
  padding: 10px 0;
  text-align: left;
}
.reviewEmpty {
  text-align: center;
  color: var(--muted);
  padding: 40px;
}
</style>
