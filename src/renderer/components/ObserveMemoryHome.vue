<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { listObservations } from '../api'
import { listenDataChanged } from '../syncSignals'
import { today } from '../utils/date'
import UiButton from './ui/UiButton.vue'
import UiBadge from './ui/UiBadge.vue'
import UiCard from './ui/UiCard.vue'
import UiEmpty from './ui/UiEmpty.vue'

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

async function refreshObservations() {
  loadingObservations.value = true
  try {
    const data = await listObservations({ date: getTodayDate(), limit: 4 })
    recentObservations.value = data?.observations || []
    observationOverview.value = buildObservationOverview(recentObservations.value)
  } catch {
    recentObservations.value = []
    observationOverview.value = {
      total: 0,
      topType: '',
    }
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
    <UiCard class="omHead">
      <div class="omHeadMain">
        <div class="omTitle">观察日志</div>
      </div>
      <div class="omHeadActions">
        <UiButton variant="ghost" @click="$emit('goChat')">去聊天</UiButton>
        <UiButton variant="default" @click="$emit('go', 'observation-list')">记一件小事</UiButton>
      </div>
    </UiCard>

    <!-- 当天观察 -->
    <UiCard class="omObserve">
      <div class="omObserveHead">
        <div class="omSectionTitleWrap">
          <div class="omObserveTitle">最近的观察记录</div>
          <UiBadge>{{ observationOverview.total }} 条</UiBadge>
        </div>
        <UiButton variant="ghost" @click="$emit('go', 'observation-list')">看全部观察</UiButton>
      </div>

      <div v-if="loadingObservations" class="omLoading">加载中…</div>
      <UiEmpty v-else-if="recentObservations.length === 0" icon="📝" text="今天还没有观察记录" />
      <div v-else class="omObserveList">
        <div class="omObserveOverview">
          <div class="omObserveOverviewItem">
            <div class="omObserveOverviewValue">{{ observationOverview.total }}</div>
            <div class="omObserveOverviewLabel">今日观察</div>
          </div>
          <div class="omObserveOverviewItem">
            <div class="omObserveOverviewValue">{{ observationTypeLabel(observationOverview.topType) }}</div>
            <div class="omObserveOverviewLabel">最多类型</div>
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
            {{ truncated(item.content || '暂无内容', 96) }}
          </div>
        </div>
      </div>
    </UiCard>
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
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
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
  font-size: var(--text-xl);
  font-weight: 800;
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

.omLoading {
  text-align: center;
  color: var(--muted);
  padding: 16px;
  font-size: var(--text-base);
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
  font-size: var(--text-md);
}

.omObserveList {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.omObserveOverview {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.omObserveOverviewItem {
  padding: 10px 12px;
}
.omObserveOverviewValue {
  font-size: var(--text-xl);
  font-weight: 800;
}
.omObserveOverviewLabel {
  font-size: var(--text-xs);
  color: var(--muted);
  margin-top: 2px;
}

.omObserveCard {
  padding: 12px;
  cursor: pointer;
}
.omObserveCard:hover {
  background: var(--surface-2);
}
.omObserveMetaRow {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--muted);
}
.omObserveType {
  font-weight: 600;
}
.omObserveCardTitle {
  font-weight: 600;
  font-size: var(--text-base);
  margin-top: 4px;
}
.omObserveCardSnippet {
  font-size: var(--text-sm);
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
