<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { createObservation, deleteObservation, listObservations } from '../api'
import { today } from '../utils/date'
import { useDebouncedValue } from '../composables/useTimers'
import { useRequestGuard } from '../composables/useRequestGuard'
import UiButton from './ui/UiButton.vue'
import UiBadge from './ui/UiBadge.vue'
import UiCard from './ui/UiCard.vue'
import UiEmpty from './ui/UiEmpty.vue'

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
    errorMsg.value = e?.message || '加载失败，请稍后再试'
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
    errorMsg.value = e?.message || '保存失败，请稍后再试'
  } finally {
    adding.value = false
  }
}

async function removeObservation(id) {
  if (!confirm('确认删除这条观察？')) return
  try {
    await deleteObservation(id)
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '删除失败，请稍后再试'
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
      <UiButton variant="ghost" @click="$emit('back')">← 返回</UiButton>
      <div class="olistHeadBody">
        <div class="olistTitle">观察记录</div>
      </div>
      <UiButton variant="default" @click="showAdd = !showAdd">
        {{ showAdd ? '先不记了' : '记一件小事' }}
      </UiButton>
    </header>

    <div class="olistTabs">
      <button class="tabBtn" :class="{ active: activeTab === 'today' }" @click="setTab('today')">今天的小事</button>
      <button class="tabBtn" :class="{ active: activeTab === 'history' }" @click="setTab('history')">回翻以前</button>
    </div>

    <div v-if="errorMsg" class="olistError">{{ errorMsg }}</div>

    <UiCard v-if="showAdd" class="olistAdd">
      <div class="olistAddTitle">记下一件小事</div>
      <input v-model="newForm.title" placeholder="标题，比如：今天中午吃了粿条" />
      <textarea v-model="newForm.content" placeholder="补充细节" rows="3" />
      <UiButton variant="default" :disabled="adding || !newForm.title.trim()" @click="addObservation">
        {{ adding ? '保存中…' : '保存这件小事' }}
      </UiButton>
    </UiCard>

    <div v-if="activeTab === 'history'" class="olistFilters">
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
        <input v-model="keyword" type="text" placeholder="比如：龙虾、考试" />
      </label>
    </div>

    <div v-if="loading" class="olistLoading">加载中…</div>

    <template v-else-if="activeTab === 'today'">
      <UiEmpty v-if="observations.length === 0" icon="📝" text="今天还没有观察记录" />

      <div v-else class="olistList">
        <UiCard v-for="obs in observations" :key="obs.id" class="olistCard" @click="$emit('go', 'detail', obs.id)">
          <div class="olistCardHead">
            <div>
              <div class="olistCardTitle">{{ obs.title }}</div>
              <div class="olistMetaRow">
                <UiBadge>{{ typeMap[obs.type] || '小事记录' }}</UiBadge>
                <span class="olistCardDate">{{ obs.date }}</span>
              </div>
            </div>
          </div>
          <div class="olistCardContent">{{ truncated(obs.content || '暂无内容', 140) }}</div>
          <UiButton variant="dangerGhost" size="sm" class="olistDelBtn" @click.stop="removeObservation(obs.id)">
            删除这条
          </UiButton>
        </UiCard>
      </div>
    </template>

    <template v-else>
      <div class="archivePanel">
        <aside class="archiveRail">
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
          <div v-if="archiveDates.length === 0" class="archiveEmpty">暂无匹配结果</div>
        </aside>

        <div class="archiveContent">
          <UiEmpty v-if="groupedHistory.length === 0" icon="🗂️" text="没有匹配的小事" />

          <div v-else class="archiveGroups">
            <section v-for="group in groupedHistory" :key="group.date" class="archiveGroup">
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
                      <UiBadge>{{ typeMap[obs.type] || '小事记录' }}</UiBadge>
                    </div>
                  </div>
                  <div class="olistCardContent">
                    {{ truncated(obs.content || '暂无内容', 150) }}
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
  align-items: center;
  gap: 14px;
}

.olistHeadBody {
  min-width: 0;
  flex: 1;
}

.olistTitle {
  font-size: var(--text-xl);
  font-weight: 800;
}

.olistTabs {
  display: flex;
  gap: 8px;
}

.tabBtn {
  background: var(--surface-2);
  color: var(--text);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: var(--text-base);
  font-weight: 600;
}

.tabBtn.active {
  background: color-mix(in srgb, var(--color-accent) 16%, transparent);
  color: var(--accent-hover);
}

.olistError {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-danger) 6%, transparent);
  color: var(--danger);
  font-size: var(--text-base);
}

.olistAdd {
  gap: 10px;
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
  font-size: var(--text-sm);
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
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  border-radius: 999px;
}

.olistCard {
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.olistCard:hover {
  background: var(--surface-2);
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

.olistCardDate {
  font-size: var(--text-sm);
  color: var(--muted);
}

.olistCardContent {
  font-size: var(--text-base);
  color: var(--muted);
  line-height: 1.6;
}

.olistDelBtn {
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
  padding: 4px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.archiveRailTitle {
  font-size: var(--text-base);
  font-weight: 700;
}

.archiveDateBtn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: transparent;
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: var(--text-sm);
  color: var(--text);
  text-align: left;
}

.archiveDateBtn:hover {
  background: var(--surface-2);
}

.archiveDateBtn.active {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-accent-hover);
}

.archiveEmpty {
  padding: 10px 4px;
  color: var(--muted);
  font-size: var(--text-sm);
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
  gap: 16px;
}

.archiveGroupHead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.archiveGroupTitle {
  font-size: var(--text-lg);
  font-weight: 700;
}

.archiveGroupCount {
  font-size: var(--text-sm);
  color: var(--muted);
}

.archiveGroupList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.archiveItem {
  padding: 12px 14px;
  cursor: pointer;
}

.archiveItem:hover {
  background: var(--surface-2);
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
