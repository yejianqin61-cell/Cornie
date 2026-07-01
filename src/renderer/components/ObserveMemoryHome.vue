<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { listMemoryWikiPages, listObservations } from '../api'
import { listenDataChanged } from '../syncSignals'

const IDENTITY_MEMORY_PAGE_TYPES = new Set([
  'identity_profile',
  'identity_preference',
  'identity_trait',
  'identity_person'
])

const recentMemories = ref([])
const loadingMemories = ref(false)
const recentObservations = ref([])
const loadingObservations = ref(false)

const OBSERVATION_TYPE_LABELS = {
  event: '生活事件',
  fact: '事实片段',
  emotion: '情绪变化',
  preference: '偏好线索',
  misc: '小事记录'
}

const MEMORY_TYPE_LABELS = {
  identity_profile: '关于你',
  identity_person: '重要的人',
  identity_preference: '你的偏好',
  identity_trait: '你的特征'
}

const primaryIdentityMemory = ref(null)
const otherRecentMemories = ref([])
const shouldPromptProfileCreation = ref(false)
const memoryOverview = ref({
  total: 0,
  personCount: 0,
  preferenceAndTraitCount: 0
})
const latestMemoryUpdateLabel = ref('')
const observationOverview = ref({
  total: 0,
  topType: ''
})
const latestObservationUpdateLabel = ref('')

async function refreshMemories() {
  loadingMemories.value = true
  try {
    const data = await listMemoryWikiPages({ status: 'active' })
    const pages = (data?.pages || []).filter((page) => IDENTITY_MEMORY_PAGE_TYPES.has(page.pageType))
    recentMemories.value = pages.slice(0, 5)
    primaryIdentityMemory.value = pages.find((page) => page.pageType === 'identity_profile') || null
    otherRecentMemories.value = pages
      .filter((page) => page.id !== primaryIdentityMemory.value?.id)
      .slice(0, 4)
    shouldPromptProfileCreation.value = pages.length > 0 && !primaryIdentityMemory.value
    memoryOverview.value = {
      total: pages.length,
      personCount: pages.filter((page) => page.pageType === 'identity_person').length,
      preferenceAndTraitCount: pages.filter((page) => page.pageType === 'identity_preference' || page.pageType === 'identity_trait').length
    }
    latestMemoryUpdateLabel.value = formatLatestMemoryUpdate(pages)
  } catch {
    recentMemories.value = []
    primaryIdentityMemory.value = null
    otherRecentMemories.value = []
    shouldPromptProfileCreation.value = false
    memoryOverview.value = {
      total: 0,
      personCount: 0,
      preferenceAndTraitCount: 0
    }
    latestMemoryUpdateLabel.value = ''
  } finally {
    loadingMemories.value = false
  }
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
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
      topType: ''
    }
    latestObservationUpdateLabel.value = ''
  } finally {
    loadingObservations.value = false
  }
}

let stopListening = () => {}

onMounted(() => {
  refreshMemories()
  refreshObservations()
  stopListening = listenDataChanged((detail) => {
    if (detail?.memory || detail?.observation) refreshMemories()
    if (detail?.observation) refreshObservations()
  })
})

onBeforeUnmount(() => {
  stopListening()
})

function truncated(text, maxLen = 80) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

function observationTypeLabel(type) {
  return OBSERVATION_TYPE_LABELS[type] || '小事记录'
}

function memoryTypeLabel(type) {
  return MEMORY_TYPE_LABELS[type] || '长期记忆'
}

function normalizeDateText(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function formatLatestMemoryUpdate(pages) {
  const latest = pages
    .map((page) => normalizeDateText(page.updatedAt || page.createdAt))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0]
  return latest || ''
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
    topType
  }
}

function formatLatestObservationUpdate(items) {
  const latest = (Array.isArray(items) ? items : [])
    .map((item) => normalizeDateText(item?.updatedAt || item?.createdAt || item?.date))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0]
  return latest || ''
}
</script>

<template>
  <div class="omPage">
    <!-- 温和引导区 -->
    <div class="omIntro card">
      <div class="omIntroIcon">🌟</div>
      <div class="omIntroTitle">想记住的小事</div>
      <div class="omIntroText">
        这里是你想记住的生活片段。铃湾也会帮你把重要的东西记下来。<br />
        和铃湾聊天时提到的事，她会自动帮你整理成记忆。
      </div>
    </div>

    <!-- 快速记观察 -->
    <div class="omQuick card">
      <div class="omQuickTitle">记下一件小事</div>
      <div class="omQuickHint">
        去<a href="#" @click.prevent="$emit('goChat')">聊天</a>
        页告诉铃湾你想记住什么，她会帮你整理好。比如"我今天去了一个新咖啡馆"。
      </div>
    </div>

    <!-- 重要记忆入口 -->
    <div class="omMemories card">
      <div class="omMemoriesHead">
        <div class="omSectionTitleWrap">
          <div class="omMemoriesTitle">铃湾帮你记住的事</div>
          <span class="omSectionBadge">{{ memoryOverview.total }} 页</span>
        </div>
        <div class="omMemoriesActions">
          <button class="ghost" @click="$emit('go', 'memory-list')">看完整记忆</button>
          <button class="primary" @click="$emit('go', 'memory-create')">新建记忆</button>
        </div>
      </div>

      <div v-if="loadingMemories" class="omLoading">正在翻翻记忆…</div>
      <div v-else-if="recentMemories.length === 0" class="omEmpty">
        <div class="omEmptyIcon">📝</div>
        <div class="omEmptyText">铃湾还在慢慢记住关于你的事</div>
        <div class="omEmptyHint">多和铃湾聊聊天，她会帮你记住重要的东西</div>
        <button class="primary omEmptyAction" @click="$emit('go', 'memory-create')">先写下“关于你”</button>
      </div>
      <div v-else class="omMemoryList">
        <div class="omSectionScopeHint">
          这里先放了最近 {{ primaryIdentityMemory ? otherRecentMemories.length + 1 : recentMemories.length }} 页记忆，想慢慢翻更多，可以去完整记忆列表。
        </div>

        <div v-if="latestMemoryUpdateLabel" class="omMemoryUpdatedHint">
          这些记忆最近整理在 {{ latestMemoryUpdateLabel }}
        </div>

        <div class="omMemoryOverview">
          <div class="omMemoryOverviewCard">
            <div class="omMemoryOverviewValue">{{ memoryOverview.total }}</div>
            <div class="omMemoryOverviewLabel">已经记住了几页</div>
          </div>
          <div class="omMemoryOverviewCard">
            <div class="omMemoryOverviewValue">{{ memoryOverview.personCount }}</div>
            <div class="omMemoryOverviewLabel">重要的人</div>
          </div>
          <div class="omMemoryOverviewCard">
            <div class="omMemoryOverviewValue">{{ memoryOverview.preferenceAndTraitCount }}</div>
            <div class="omMemoryOverviewLabel">偏好与特征</div>
          </div>
        </div>

        <div class="omSectionNextHint">
          点查看全部，就能去完整记忆列表慢慢翻。
        </div>

        <div v-if="shouldPromptProfileCreation" class="omProfilePrompt">
          <div class="omProfilePromptText">
            <div class="omProfilePromptTitle">铃湾已经记下一些事了，也可以先更清楚地记住你</div>
            <div class="omProfilePromptHint">写下一页“关于你”，以后再回来看这些记忆时，会更容易串起来。</div>
          </div>
          <button class="primary" @click.stop="$emit('go', 'memory-create')">先写下“关于你”</button>
        </div>

        <div
          v-if="primaryIdentityMemory"
          class="omPrimaryMemoryCard"
          @click="$emit('go', 'memory-detail', primaryIdentityMemory.id)"
        >
          <div class="omPrimaryEyebrow">铃湾现在最先记住的你</div>
          <div class="omPrimaryTitle">{{ primaryIdentityMemory.title }}</div>
          <div class="omPrimarySummary">
            {{ truncated(primaryIdentityMemory.summary || primaryIdentityMemory.content || '先把最重要的自己留在这里。', 120) }}
          </div>
        </div>

        <div
          v-for="mem in (primaryIdentityMemory ? otherRecentMemories : recentMemories)"
          :key="mem.id"
          class="omMemoryCard"
          @click="$emit('go', 'memory-detail', mem.id)"
        >
          <div class="omMemoryType">{{ memoryTypeLabel(mem.pageType) }}</div>
          <div class="omMemoryTitle">{{ mem.title }}</div>
          <div class="omMemorySnippet" v-if="mem.summary">{{ truncated(mem.summary, 100) }}</div>
          <div class="omMemorySnippet" v-else>{{ truncated(mem.content, 100) }}</div>
        </div>
      </div>
    </div>

    <!-- 观察记录入口 -->
    <div class="omObserve card">
      <div class="omObserveHead">
        <div class="omSectionTitleWrap">
          <div class="omObserveTitle">最近的观察记录</div>
          <span class="omSectionBadge">{{ observationOverview.total }} 条</span>
        </div>
        <button class="ghost" @click="$emit('go', 'observation-list')">看全部观察</button>
      </div>
      <div class="omObserveHint">
        铃湾会在值得留下来的时候，记一小段事实。不是每句聊天都会被写成流水账。
      </div>

      <div v-if="loadingObservations" class="omLoading">铃湾正在翻今天的小事…</div>
      <div v-else-if="recentObservations.length === 0" class="omObserveEmpty">
        <div class="omObserveEmptyTitle">今天还没有新的观察记录</div>
        <div class="omObserveEmptyHint">铃湾不会把每句闲聊都记下来，只有觉得值得留一下的时候，才会写进观察。</div>
      </div>
      <div v-else class="omObserveList">
        <div class="omSectionScopeHint">
          这里只先放了最近 {{ recentObservations.length }} 条观察，想看今天更完整的整理，可以点查看全部。
        </div>

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

        <div class="omSectionNextHint">
          点查看全部，就能看今天和以前的小事整理。
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
          <div class="omObserveCardSnippet">{{ truncated(item.content || '铃湾把这件小事轻轻放进了今天的观察里。', 96) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.omPage{
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}
.omPage::-webkit-scrollbar{ width: 4px; }
.omPage::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

/* ─── 引导区 ─── */
.omIntro{
  background: var(--memory-tint);
  padding: 18px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.omIntroIcon{ font-size: 32px; }
.omIntroTitle{ font-size: 17px; font-weight: 800; }
.omIntroText{
  font-size: 13px;
  color: var(--muted);
  line-height: 1.7;
  max-width: 480px;
}

/* ─── 快速记观察 ─── */
.omQuick{ padding: 14px 20px; }
.omQuickTitle{ font-weight: 700; font-size: 14px; margin-bottom: 6px; }
.omQuickHint{ font-size: 13px; color: var(--muted); line-height: 1.6; }
.omQuickHint a{ color: var(--accent); }

/* ─── 记忆区 ─── */
.omMemories{ padding: 14px 20px; }
.omMemoriesHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.omSectionTitleWrap{
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.omSectionBadge{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(0,0,0,.05);
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
}
.omMemoriesActions{
  display: flex;
  gap: 8px;
}
.omMemoriesTitle{ font-weight: 700; }

.omLoading{ text-align: center; color: var(--muted); padding: 16px; font-size: 13px; }
.omEmpty{
  text-align: center;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.omEmptyIcon{ font-size: 24px; }
.omEmptyText{ font-size: 13px; color: var(--muted); }
.omEmptyHint{ font-size: 12px; color: var(--muted); }
.omEmptyAction{ margin-top: 8px; }

.omMemoryList{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

.omMemoryUpdatedHint{
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

.omSectionScopeHint{
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

.omSectionNextHint{
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

.omMemoryOverview{
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.omMemoryOverviewCard{
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255,255,255,.92);
  padding: 12px;
}

.omMemoryOverviewValue{
  font-size: 20px;
  font-weight: 800;
}

.omMemoryOverviewLabel{
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.omProfilePrompt{
  grid-column: 1 / -1;
  padding: 14px 16px;
  border: 1px dashed rgba(232,133,106,.36);
  border-radius: 16px;
  background: rgba(255,249,244,.82);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.omProfilePromptText{
  min-width: 0;
}

.omProfilePromptTitle{
  font-size: 13px;
  font-weight: 700;
}

.omProfilePromptHint{
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
}

.omPrimaryMemoryCard{
  grid-column: 1 / -1;
  padding: 16px 18px;
  border: 1px solid rgba(232,133,106,.22);
  border-radius: 16px;
  cursor: pointer;
  background: linear-gradient(135deg, rgba(232,133,106,.12), rgba(255,249,244,.96));
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}

.omPrimaryMemoryCard:hover{
  transform: translateY(-1px);
  border-color: rgba(232,133,106,.34);
  box-shadow: 0 12px 26px rgba(203,127,90,.14);
}

.omPrimaryEyebrow{
  font-size: 11px;
  letter-spacing: .04em;
  color: var(--muted);
}

.omPrimaryTitle{
  margin-top: 4px;
  font-size: 16px;
  font-weight: 800;
}

.omPrimarySummary{
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--muted);
}
.omMemoryCard{
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: background .15s, border-color .15s, transform .15s;
}
.omMemoryCard:hover{
  background: var(--surface-2);
  border-color: rgba(232,133,106,.20);
  transform: translateY(-1px);
}

.omMemoryType{
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(232,133,106,.12);
  color: var(--accent-strong);
  font-size: 11px;
}

.omMemoryTitle{ font-weight: 600; font-size: 13px; }
.omMemorySnippet{
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
  line-height: 1.5;
}

/* ─── 观察区 ─── */
.omObserve{ padding: 12px 20px; }
.omObserveHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.omObserveTitle{ font-weight: 700; font-size: 14px; }
.omObserveHint{ font-size: 13px; color: var(--muted); line-height: 1.6; }
.omObserveHint a{ color: var(--accent); }

.omObserveEmpty{
  margin-top: 10px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 14px;
  color: var(--muted);
}

.omObserveEmptyTitle{
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.omObserveEmptyHint{
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
}

.omObserveList{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.omObserveUpdatedHint{
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

.omObserveOverview{
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.omObserveOverviewCard{
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255,255,255,.92);
  padding: 12px;
}

.omObserveOverviewValue{
  font-size: 18px;
  font-weight: 800;
}

.omObserveOverviewLabel{
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.omObserveCard{
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255,255,255,.88);
  cursor: pointer;
  transition: background .15s, border-color .15s, transform .15s;
}

.omObserveCard:hover{
  background: var(--surface-2);
  border-color: rgba(232,133,106,.20);
  transform: translateY(-1px);
}

.omObserveMetaRow{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.omObserveType{
  font-size: 11px;
  color: var(--accent-strong);
  background: rgba(232,133,106,.12);
  border-radius: 999px;
  padding: 3px 8px;
}

.omObserveDate{
  font-size: 11px;
  color: var(--muted);
}

.omObserveCardTitle{
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
}

.omObserveCardSnippet{
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

@media (max-width: 760px){
  .omMemoryList{ grid-template-columns: 1fr; }
  .omMemoryOverview{ grid-template-columns: 1fr; }
  .omProfilePrompt{
    flex-direction: column;
    align-items: stretch;
  }
  .omMemoriesHead{
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .omSectionTitleWrap{
    justify-content: space-between;
  }
  .omMemoriesActions{
    flex-direction: column;
  }
  .omObserveOverview{ grid-template-columns: 1fr; }
  .omObserveList{ grid-template-columns: 1fr; }
}
</style>
