<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { createObservation, deleteObservation, listObservations } from '../api'
import { today } from '../utils/date'
import { useDebouncedValue } from '../composables/useTimers'
import { useRequestGuard } from '../composables/useRequestGuard'

// FE-05：筛选/日期快速变化时旧响应不得覆盖新列表。
const obsGuard = useRequestGuard()

const OBSERVATION_TYPES = [
  { value: '', label: '全部小事' },
  { value: 'event', label: '生活事件' },
  { value: 'fact', label: '事实片段' },
  { value: 'emotion', label: '情绪变化' },
  { value: 'preference', label: '偏好线索' },
  { value: 'misc', label: '小事记录' },
]

function getTodayDate() {
  return today()
}

function formatDateLabel(date) {
  if (!date) return '未命名日期'
  const today = getTodayDate()
  if (date === today) return `今天 · ${date}`
  return date
}

function truncated(text, maxLen = 100) {
  if (!text) return ''
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}

const observations = ref([])
const loading = ref(false)
const errorMsg = ref('')

const showAdd = ref(false)
const newForm = ref({ title: '', content: '' })
const adding = ref(false)

const activeTab = ref('today')
const selectedDate = ref(getTodayDate())
const selectedType = ref('')
const keyword = ref('')

const typeMap = Object.fromEntries(
  OBSERVATION_TYPES.filter((item) => item.value).map((item) => [item.value, item.label])
)

const groupedHistory = computed(() => {
  const groups = new Map()
  for (const item of observations.value) {
    const key = item.date || 'unknown'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }

  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    label: formatDateLabel(date),
    count: items.length,
    items,
  }))
})

const archiveDates = computed(() =>
  groupedHistory.value.map((group) => ({
    date: group.date,
    label: group.label,
    count: group.count,
  }))
)

async function refresh() {
  const { token, signal } = obsGuard.begin('list')
  loading.value = true
  errorMsg.value = ''
  try {
    if (activeTab.value === 'today') {
      const data = await listObservations({ date: getTodayDate(), limit: 100, signal })
      if (!obsGuard.isCurrent('list', token)) return
      observations.value = data?.observations || []
      selectedDate.value = getTodayDate()
      return
    }

    const hasQuery = keyword.value.trim().length > 0
    const hasDate = selectedDate.value && selectedDate.value !== getTodayDate()
    const data = await listObservations({
      date: !hasQuery && hasDate ? selectedDate.value : undefined,
      from: hasQuery ? undefined : selectedDate.value || undefined,
      to: hasQuery ? undefined : selectedDate.value || undefined,
      type: selectedType.value || undefined,
      q: keyword.value.trim() || undefined,
      limit: 200,
      signal,
    })
    if (!obsGuard.isCurrent('list', token)) return
    observations.value = data?.observations || []
  } catch (e) {
    if (!obsGuard.isCurrent('list', token)) return
    errorMsg.value = e?.message || '这页小事暂时没打开成功，稍后再试一次吧。'
  } finally {
    if (obsGuard.isCurrent('list', token)) {
      loading.value = false
      obsGuard.end('list', token)
    }
  }
}

async function addObservation() {
  const title = newForm.value.title.trim()
  const content = newForm.value.content.trim()
  if (!title || !content) return

  adding.value = true
  try {
    await createObservation({ title, content, type: 'misc' })
    newForm.value = { title: '', content: '' }
    showAdd.value = false
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '这件小事这次还没记下来，我们再试一次吧。'
  } finally {
    adding.value = false
  }
}

async function removeObservation(id) {
  if (!confirm('要把这条小事删掉吗？删掉后，它就不会再留在观察里了。')) return
  try {
    await deleteObservation(id)
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '这条小事这次还没删掉，我们稍后再试一次吧。'
  }
}

function setTab(tab) {
  activeTab.value = tab
  if (tab === 'today') {
    selectedDate.value = getTodayDate()
    selectedType.value = ''
    keyword.value = ''
  }
}

watch([activeTab, selectedDate, selectedType], () => {
  refresh()
})

// FE-04：防抖搜索接入统一定时器工具，组件卸载自动清理，不再悬挂裸 setTimeout。
useDebouncedValue(keyword, 220, () => {
  refresh()
})

onMounted(refresh)
</script>

<template>
  <div class="olist">
    <header class="olistHead">
      <button class="ghost" @click="$emit('back')">← 返回</button>
      <div class="olistHeadBody">
        <div class="olistTitle">观察记录</div>
      </div>
      <button class="primary" @click="showAdd = !showAdd">
        {{ showAdd ? '先不记了' : '记一件小事' }}
      </button>
    </header>

    <div class="olistTabs">
      <button class="tabBtn" :class="{ active: activeTab === 'today' }" @click="setTab('today')">今天的小事</button>
      <button class="tabBtn" :class="{ active: activeTab === 'history' }" @click="setTab('history')">回翻以前</button>
    </div>

    <div v-if="errorMsg" class="olistError">{{ errorMsg }}</div>

    <div v-if="showAdd" class="olistAdd card">
      <div class="olistAddTitle">记下一件小事</div>
      <div class="olistAddHint">先写一个容易翻回来的标题，再把当时的情况简单记下来就好。</div>
      <input v-model="newForm.title" placeholder="比如：今天中午又吃了粿条" />
      <textarea v-model="newForm.content" placeholder="把这件小事补充完整一点。" rows="3" />
      <button class="primary" :disabled="adding || !newForm.title.trim()" @click="addObservation">
        {{ adding ? '保存中…' : '保存这件小事' }}
      </button>
    </div>

    <div v-if="activeTab === 'history'" class="olistFilters card">
      <label class="filterField">
        <span>日期</span>
        <input v-model="selectedDate" type="date" />
      </label>
      <label class="filterField">
        <span>类别</span>
        <select v-model="selectedType">
          <option v-for="item in OBSERVATION_TYPES" :key="item.value || 'all'" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>
      <label class="filterField grow">
        <span>关键词</span>
        <input v-model="keyword" type="text" placeholder="比如：龙虾、钟奕菲、考试、花钱" />
      </label>
    </div>

    <div v-if="loading" class="olistLoading">铃湾正在翻这些小事…</div>

    <template v-else-if="activeTab === 'today'">
      <div v-if="observations.length === 0" class="olistEmpty">
        <div class="olistEmptyIcon">📝</div>
        <div class="olistEmptyTitle">今天还没有新的观察记录</div>
        <div class="olistEmptyHint">铃湾不会把每句闲聊都写成流水账，只有觉得值得留一下的时候，才会记在这里。</div>
      </div>

      <div v-else class="olistList">
        <div v-for="obs in observations" :key="obs.id" class="olistCard card" @click="$emit('go', 'detail', obs.id)">
          <div class="olistCardHead">
            <div>
              <div class="olistCardTitle">{{ obs.title }}</div>
              <div class="olistMetaRow">
                <span class="olistType">{{ typeMap[obs.type] || '小事记录' }}</span>
                <span class="olistCardDate">{{ obs.date }}</span>
              </div>
            </div>
          </div>
          <div class="olistCardContent">{{ truncated(obs.content || '铃湾先把这件小事轻轻放在了今天。', 140) }}</div>
          <button class="ghost olistDelBtn" @click.stop="removeObservation(obs.id)">删除这条</button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="archivePanel">
        <aside class="archiveRail card">
          <div class="archiveRailTitle">回翻日期</div>
          <button
            v-for="item in archiveDates"
            :key="item.date"
            class="archiveDateBtn"
            :class="{ active: selectedDate === item.date }"
            @click="selectedDate = item.date"
          >
            <span>{{ item.label }}</span>
            <span>{{ item.count }}</span>
          </button>
          <div v-if="archiveDates.length === 0" class="archiveEmpty">当前筛选下，还没有找到能翻回来的小事。</div>
        </aside>

        <div class="archiveContent">
          <div v-if="groupedHistory.length === 0" class="olistEmpty">
            <div class="olistEmptyIcon">🗂️</div>
            <div class="olistEmptyTitle">还没有找到匹配的小事</div>
            <div class="olistEmptyHint">换个日期、类别或关键词，也许就能把那天的片段翻出来了。</div>
          </div>

          <div v-else class="archiveGroups">
            <section v-for="group in groupedHistory" :key="group.date" class="archiveGroup card">
              <div class="archiveGroupHead">
                <div class="archiveGroupTitle">{{ group.label }}</div>
                <div class="archiveGroupCount">{{ group.count }} 条</div>
              </div>
              <div class="archiveGroupList">
                <article
                  v-for="obs in group.items"
                  :key="obs.id"
                  class="archiveItem"
                  @click="$emit('go', 'detail', obs.id)"
                >
                  <div class="archiveItemHead">
                    <div class="olistCardTitle">{{ obs.title }}</div>
                    <div class="olistMetaRow">
                      <span class="olistType">{{ typeMap[obs.type] || '小事记录' }}</span>
                    </div>
                  </div>
                  <div class="olistCardContent">
                    {{ truncated(obs.content || '铃湾把这件小事留在了这一天。', 150) }}
                  </div>
                </article>
              </div>
            </section>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.olist {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.olistHead {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}

.olistHeadBody {
  min-width: 0;
  flex: 1;
}

.olistTitle {
  font-size: 18px;
  font-weight: 800;
}

.olistHint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

.olistTabs {
  display: flex;
  gap: 8px;
}

.tabBtn {
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
}

.tabBtn.active {
  background: rgba(232, 133, 106, 0.16);
  border-color: rgba(232, 133, 106, 0.28);
  color: var(--accent-strong);
}

.olistGuide {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.olistGuideTitle {
  font-size: 13px;
  font-weight: 700;
}

.olistGuideText {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.olistGuideSoft {
  font-size: 12px;
  color: var(--accent-strong);
  background: rgba(232, 133, 106, 0.1);
  align-self: flex-start;
  border-radius: 999px;
  padding: 4px 8px;
}

.olistError {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(217, 106, 92, 0.25);
  background: rgba(217, 106, 92, 0.06);
  color: var(--danger);
  font-size: 13px;
}

.olistAdd,
.olistFilters {
  padding: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: end;
}

.olistAdd {
  flex-direction: column;
  align-items: stretch;
}

.olistAddTitle {
  font-size: 14px;
  font-weight: 700;
}

.olistAddHint {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

.olistAdd textarea {
  min-height: 80px;
}

.filterField {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 150px;
}

.filterField span {
  font-size: 12px;
  color: var(--muted);
}

.filterField.grow {
  flex: 1;
}

.olistLoading {
  text-align: center;
  color: var(--muted);
  padding: 30px;
}

.olistEmpty {
  text-align: center;
  color: var(--muted);
  padding: 40px;
  border: 1px dashed var(--border);
  border-radius: 14px;
}

.olistEmptyIcon {
  font-size: 28px;
  margin-bottom: 8px;
}

.olistEmptyTitle {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.olistEmptyHint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
}

.olistList {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}

.olistList::-webkit-scrollbar,
.archiveContent::-webkit-scrollbar {
  width: 4px;
}

.olistList::-webkit-scrollbar-thumb,
.archiveContent::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
}

.olistCard {
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.olistCard:hover,
.archiveItem:hover {
  border-color: rgba(232, 133, 106, 0.25);
}

.olistCardHead,
.archiveItemHead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.olistCardTitle {
  font-weight: 600;
}

.olistMetaRow {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
  flex-wrap: wrap;
}

.olistType {
  font-size: 12px;
  color: var(--accent-strong);
  background: rgba(232, 133, 106, 0.12);
  border-radius: 999px;
  padding: 3px 8px;
}

.olistCardDate {
  font-size: 12px;
  color: var(--muted);
}

.olistCardContent {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.olistDelBtn {
  font-size: 12px;
  align-self: flex-end;
}

.archivePanel {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 12px;
}

.archiveRail {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.archiveRailTitle {
  font-size: 13px;
  font-weight: 700;
}

.archiveDateBtn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--text);
  text-align: left;
}

.archiveDateBtn.active {
  background: rgba(232, 133, 106, 0.12);
  border-color: rgba(232, 133, 106, 0.28);
  color: var(--accent-strong);
}

.archiveEmpty {
  padding: 10px 4px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.archiveContent {
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}

.archiveGroups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.archiveGroup {
  padding: 14px 16px;
}

.archiveGroupHead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.archiveGroupTitle {
  font-size: 15px;
  font-weight: 700;
}

.archiveGroupCount {
  font-size: 12px;
  color: var(--muted);
}

.archiveGroupList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.archiveItem {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.62);
  cursor: pointer;
}

@media (max-width: 960px) {
  .olistHead {
    flex-direction: column;
  }

  .archivePanel {
    grid-template-columns: 1fr;
  }

  .archiveRail {
    max-height: 180px;
  }
}
</style>
