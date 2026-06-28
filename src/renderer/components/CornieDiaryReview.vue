<script setup>
import { onMounted, ref } from 'vue'
import { listEntries, getEntry } from '../api'

function pad2(n) { return String(n).padStart(2, '0') }
function toISOMonth(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}` }

const selectedMonth = ref(toISOMonth(new Date()))
const entries = ref([])
const loading = ref(false)

async function refresh() {
  loading.value = true
  try {
    const data = await listEntries({ month: selectedMonth.value })
    entries.value = data.entries.filter((e) => e.hasCornieText)
  } catch { /* ignore */ }
  finally { loading.value = false }
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
      <div v-for="e in entries" :key="e.date" class="reviewCard card">
        <div class="reviewDate">{{ e.date }}</div>
        <div class="reviewExcerpt">点击进入可以查看完整内容…</div>
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
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
}
.reviewList::-webkit-scrollbar{ width: 4px; }
.reviewList::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.reviewCard{ padding: 16px; }
.reviewDate{ font-weight: 700; margin-bottom: 6px; }
.reviewExcerpt{ font-size: 13px; color: var(--muted); }

.reviewLoading{ text-align: center; color: var(--muted); padding: 40px; }
.reviewEmpty{
  text-align: center;
  color: var(--muted);
  padding: 40px;
  border: 1px dashed var(--border);
  border-radius: 14px;
}
</style>
