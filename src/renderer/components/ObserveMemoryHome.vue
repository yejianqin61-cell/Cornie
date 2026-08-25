<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { listObservations } from '../api'
import { listenDataChanged } from '../syncSignals'
import { formatDate, today } from '../utils/date'

// R-04：观察日志首页（记忆三栏之一）——只承载"当天观察"相关内容。

const OBSERVATION_TYPE_LABELS = {
  event: '生活事件',
  fact: '事实片段',
  emotion: '情绪变化',
  preference: '偏好线索',
  misc: '小事记录',
}

defineEmits(['go', 'goChat'])

const recentObservations = ref([])
const loadingObservations = ref(false)

const observationOverview = ref({
  total: 0,
  topType: '',
})
const latestObservationUpdateLabel = ref('')

function getTodayDate() {
  return today()
}

function truncated(text, maxLen = 80) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

function observationTypeLabel(type) {
  return OBSERVATION_TYPE_LABELS[type] || '小事记录'
}

function normalizeDateText(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return ''
  return formatDate(parsed)
}

function buildObservationOverview(items) {
  const list = Array.isArray(items) ? items : []
  const counts = new Map()
  for (const item of list) {
    const key = String(item?.type || 'misc')
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const topType = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  return {
    total: list.length,
    topType,
  }
}

function formatLatestObservationUpdate(items) {
  const latest = (Array.isArray(items) ? items : [])
    .map((item) => normalizeDateText(item?.updatedAt || item?.createdAt || item?.date))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0]
  return latest || ''
}

async function refreshObservations() {
  loadingObservations.value = true
  try {
    const data = await listObservations({ date: getTodayDate(), limit: 4 })
    recentObservations.value = data?.observations || []
    observationOverview.value = buildObservationOverview(recentObservations.value)
    latestObservationUpdateLabel.value = formatLatestObservationUpdate(recentObservations.value)
  } catch {
    recentObservations.value = []
    observationOverview.value = {
      total: 0,
      topType: '',
    }
    latestObservationUpdateLabel.value = ''
  } finally {
    loadingObservations.value = false
  }
}

let stopListening = () => {}

onMounted(() => {
  refreshObservations()
  stopListening = listenDataChanged((detail) => {
    if (detail?.observation) refreshObservations()
  })
})

onBeforeUnmount(() => {
  stopListening()
})
</script>

<template>
  <div class="omPage">
    <!-- 头部：观察日志 + 记一件小事 -->
    <div class="omHead card">
      <div class="omHeadMain">
        <div class="omTitle">观察日志</div>
        <div class="omSubtitle">今天留下的生活片段</div>
      </div>
      <div class="omHeadActions">
        <button class="ghost" @click="$emit('goChat')">去聊天</button>
        <button class="primary" @click="$emit('go', 'observation-list')">记一件小事</button>
      </div>
    </div>

    <!-- 当天观察 -->
    <div class="omObserve card">
      <div class="omObserveHead">
        <div class="omSectionTitleWrap">
          <div class="omObserveTitle">最近的观察记录</div>
          <span class="omSectionBadge">{{ observationOverview.total }} 条</span>
        </div>
        <button class="ghost" @click="$emit('go', 'observation-list')">看全部观察</button>
      </div>

      <div v-if="loadingObservations" class="omLoading">铃湾正在翻今天的小事…</div>
      <div v-else-if="recentObservations.length === 0" class="omObserveEmpty">
        <div class="omObserveEmptyTitle">今天还没有新的观察记录</div>
        <div class="omObserveEmptyHint">铃湾不会把每句闲聊都记下来，只有觉得值得留一下的时候，才会写进观察。</div>
      </div>
      <div v-else class="omObserveList">
        <div v-if="latestObservationUpdateLabel" class="omObserveUpdatedHint">
          这些观察最近记在 {{ latestObservationUpdateLabel }}
        </div>

        <div class="omObserveOverview">
          <div class="omObserveOverviewCard">
            <div class="omObserveOverviewValue">{{ observationOverview.total }}</div>
            <div class="omObserveOverviewLabel">今天留下了几条观察</div>
          </div>
          <div class="omObserveOverviewCard">
            <div class="omObserveOverviewValue">{{ observationTypeLabel(observationOverview.topType) }}</div>
            <div class="omObserveOverviewLabel">今天更多是在记什么</div>
          </div>
        </div>

        <div
          v-for="item in recentObservations"
          :key="item.id"
          class="omObserveCard"
          @click="$emit('go', 'observation-detail', item.id)"
        >
          <div class="omObserveMetaRow">
            <span class="omObserveType">{{ observationTypeLabel(item.type) }}</span>
            <span class="omObserveDate">{{ item.date }}</span>
          </div>
          <div class="omObserveCardTitle">{{ item.title }}</div>
          <div class="omObserveCardSnippet">
            {{ truncated(item.content || '铃湾把这件小事轻轻放进了今天的观察里。', 96) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.omPage {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}
.omPage::-webkit-scrollbar {
  width: 4px;
}
.omPage::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
}

.omHead {
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.omTitle {
  font-size: 18px;
  font-weight: 800;
}
.omSubtitle {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
.omHeadActions {
  display: flex;
  gap: 8px;
}

.omSectionTitleWrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.omSectionBadge {
  font-size: 11px;
  color: var(--muted);
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 8px;
  border-radius: 999px;
}

.omLoading {
  text-align: center;
  color: var(--muted);
  padding: 16px;
  font-size: 13px;
}

.omObserve {
  padding: 12px 20px;
}
.omObserveHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.omObserveTitle {
  font-weight: 700;
  font-size: 14px;
}

.omObserveEmpty {
  text-align: center;
  padding: 24px;
}
.omObserveEmptyTitle {
  font-weight: 600;
  font-size: 13px;
}
.omObserveEmptyHint {
  font-size: 12px;
  color: var(--muted);
  margin-top: 6px;
  line-height: 1.5;
}

.omObserveList {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}
.omObserveUpdatedHint {
  grid-column: 1 / -1;
  font-size: 11px;
  color: var(--muted);
}

.omObserveOverview {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.omObserveOverviewCard {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
}
.omObserveOverviewValue {
  font-size: 18px;
  font-weight: 800;
}
.omObserveOverviewLabel {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.omObserveCard {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  background: var(--surface);
}
.omObserveCard:hover {
  border-color: rgba(232, 133, 106, 0.35);
}
.omObserveMetaRow {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--muted);
}
.omObserveType {
  font-weight: 600;
}
.omObserveCardTitle {
  font-weight: 600;
  font-size: 13px;
  margin-top: 4px;
}
.omObserveCardSnippet {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
  line-height: 1.5;
}

@media (max-width: 720px) {
  .omObserveList {
    grid-template-columns: 1fr;
  }
}
</style>
