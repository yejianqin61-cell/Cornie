<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { createObservation, deleteObservation, listObservations } from '../api'

const OBSERVATION_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'event', label: '事件' },
  { value: 'fact', label: '事实' },
  { value: 'emotion', label: '情绪' },
  { value: 'preference', label: '偏好' },
  { value: 'misc', label: '其他' }
]

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
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
const observationPolicy = ref(null)
const observationPolicySummary = ref('')
const loading = ref(false)
const errorMsg = ref('')

const showAdd = ref(false)
const newForm = ref({ title: '', content: '' })
const adding = ref(false)

const activeTab = ref('today')
const selectedDate = ref(getTodayDate())
const selectedType = ref('')
const keyword = ref('')

const typeMap = Object.fromEntries(OBSERVATION_TYPES.filter((item) => item.value).map((item) => [item.value, item.label]))

const groupedHistory = computed(() => {
  const groups = new Map()
  for (const item of observations.value) {
    const key = item.date || 'unknown'
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(item)
  }

  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    label: formatDateLabel(date),
    count: items.length,
    items
  }))
})

const archiveDates = computed(() => groupedHistory.value.map((group) => ({
  date: group.date,
  label: group.label,
  count: group.count
})))

async function refresh() {
  loading.value = true
  errorMsg.value = ''
  try {
    if (activeTab.value === 'today') {
      const data = await listObservations({ date: getTodayDate(), limit: 100 })
      observations.value = data?.observations || []
      observationPolicy.value = data?.policy || null
      observationPolicySummary.value = data?.policySummary || ''
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
      limit: 200
    })
    observations.value = data?.observations || []
    observationPolicy.value = data?.policy || null
    observationPolicySummary.value = data?.policySummary || ''
  } catch (e) {
    errorMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
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
    errorMsg.value = e?.message || '添加失败'
  } finally {
    adding.value = false
  }
}

async function removeObservation(id) {
  if (!confirm('确定要删除这条观察记录吗？')) return
  try {
    await deleteObservation(id)
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '删除失败'
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

let keywordTimer = null
watch(keyword, () => {
  if (keywordTimer) clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    refresh()
  }, 220)
})

onMounted(refresh)
</script>

<template>
  <div class="olist">
    <header class="olistHead">
      <button class="ghost" @click="$emit('back')">← 返回观察与记忆</button>
      <div class="olistHeadBody">
        <div class="olistTitle">观察日志</div>
        <div class="olistHint">按自然日归档的事实记录层。聊天时不会把历史观察默认整包塞进 prompt，只会按今天高频参考、按需检索历史。</div>
      </div>
      <button class="primary" @click="showAdd = !showAdd">
        {{ showAdd ? '取消' : '记一件小事' }}
      </button>
    </header>

    <div class="olistTabs">
      <button class="tabBtn" :class="{ active: activeTab === 'today' }" @click="setTab('today')">今天</button>
      <button class="tabBtn" :class="{ active: activeTab === 'history' }" @click="setTab('history')">历史检索</button>
    </div>

    <div class="olistPolicy card">
      <div class="olistPolicyTitle">使用边界</div>
      <div class="olistPolicyText">
        观察日志更像事实档案，不是“每条都永久记住”。今天页服务当下对话，历史页用于你或铃湾按主题、类型、日期回查。
      </div>
      <div v-if="observationPolicySummary" class="olistPolicySubtext">{{ observationPolicySummary }}</div>
      <div v-if="observationPolicy" class="olistPolicyMeta">
        <span>聊天默认 {{ observationPolicy.conversationTodaySummaryLimit }} 条</span>
        <span>Wiki 补查 {{ observationPolicy.wikiRecallTodayLimit }} 条</span>
        <span>日记生成 {{ observationPolicy.diaryTodayDetailLimit }} 条</span>
      </div>
    </div>

    <div v-if="errorMsg" class="olistError">{{ errorMsg }}</div>

    <div v-if="showAdd" class="olistAdd card">
      <input v-model="newForm.title" placeholder="一句话标题" />
      <textarea v-model="newForm.content" placeholder="详细内容（可选）" rows="3" />
      <button class="primary" :disabled="adding || !newForm.title.trim()" @click="addObservation">
        {{ adding ? '保存中…' : '保存' }}
      </button>
    </div>

    <div v-if="activeTab === 'history'" class="olistFilters card">
      <label class="filterField">
        <span>日期</span>
        <input v-model="selectedDate" type="date" />
      </label>
      <label class="filterField">
        <span>类型</span>
        <select v-model="selectedType">
          <option v-for="item in OBSERVATION_TYPES" :key="item.value || 'all'" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <label class="filterField grow">
        <span>关键词</span>
        <input v-model="keyword" type="text" placeholder="比如：龙虾、钟奕菲、考试、花钱" />
      </label>
    </div>

    <div v-if="loading" class="olistLoading">加载中…</div>

    <template v-else-if="activeTab === 'today'">
      <div v-if="observations.length === 0" class="olistEmpty">
        <div class="olistEmptyIcon">📝</div>
        <div>今天还没有新的观察记录</div>
        <div class="olistEmptyHint">铃湾会在需要时写下事实，避免把每句闲聊都变成流水账。</div>
      </div>

      <div v-else class="olistList">
        <div
          v-for="obs in observations"
          :key="obs.id"
          class="olistCard card"
          @click="$emit('go', 'detail', obs.id)"
        >
          <div class="olistCardHead">
            <div>
              <div class="olistCardTitle">{{ obs.title }}</div>
              <div class="olistMetaRow">
                <span class="olistType">{{ typeMap[obs.type] || obs.type || '其他' }}</span>
                <span class="olistCardDate">{{ obs.date }}</span>
              </div>
            </div>
          </div>
          <div class="olistCardContent">{{ truncated(obs.content, 140) }}</div>
          <button class="ghost olistDelBtn" @click.stop="removeObservation(obs.id)">删除</button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="archivePanel">
        <aside class="archiveRail card">
          <div class="archiveRailTitle">归档日期</div>
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
          <div v-if="archiveDates.length === 0" class="archiveEmpty">当前筛选下还没有匹配的归档。</div>
        </aside>

        <div class="archiveContent">
          <div v-if="groupedHistory.length === 0" class="olistEmpty">
            <div class="olistEmptyIcon">🗂️</div>
            <div>没有找到匹配的历史观察</div>
            <div class="olistEmptyHint">换个日期、类型或关键词试试。</div>
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
                      <span class="olistType">{{ typeMap[obs.type] || obs.type || '其他' }}</span>
                    </div>
                  </div>
                  <div class="olistCardContent">{{ truncated(obs.content, 150) }}</div>
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
.olist{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}
.olistHead{
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}
.olistHeadBody{
  min-width: 0;
  flex: 1;
}
.olistTitle{
  font-size: 18px;
  font-weight: 800;
}
.olistHint{
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

.olistTabs{
  display: flex;
  gap: 8px;
}
.tabBtn{
  border: 1px solid var(--border);
  background: rgba(255,255,255,.72);
  color: var(--text);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
}
.tabBtn.active{
  background: rgba(232,133,106,.16);
  border-color: rgba(232,133,106,.28);
  color: var(--accent-strong);
}

.olistPolicy{
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.olistPolicyTitle{
  font-size: 13px;
  font-weight: 700;
}
.olistPolicyText{
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}
.olistPolicySubtext{
  font-size: 12px;
  color: var(--muted);
  line-height: 1.7;
  white-space: pre-wrap;
}
.olistPolicyMeta{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.olistPolicyMeta span{
  font-size: 12px;
  color: var(--accent-strong);
  background: rgba(232,133,106,.1);
  border-radius: 999px;
  padding: 4px 8px;
}

.olistError{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  font-size: 13px;
}

.olistAdd,
.olistFilters{
  padding: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: end;
}
.olistAdd{
  flex-direction: column;
  align-items: stretch;
}
.olistAdd textarea{ min-height: 80px; }
.filterField{
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 150px;
}
.filterField span{
  font-size: 12px;
  color: var(--muted);
}
.filterField.grow{
  flex: 1;
}

.olistLoading{
  text-align: center;
  color: var(--muted);
  padding: 30px;
}
.olistEmpty{
  text-align: center;
  color: var(--muted);
  padding: 40px;
  border: 1px dashed var(--border);
  border-radius: 14px;
}
.olistEmptyIcon{
  font-size: 28px;
  margin-bottom: 8px;
}
.olistEmptyHint{
  margin-top: 8px;
  font-size: 12px;
}

.olistList{
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}
.olistList::-webkit-scrollbar,
.archiveContent::-webkit-scrollbar{
  width: 4px;
}
.olistList::-webkit-scrollbar-thumb,
.archiveContent::-webkit-scrollbar-thumb{
  background: rgba(0,0,0,.08);
  border-radius: 999px;
}

.olistCard{
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.olistCard:hover,
.archiveItem:hover{
  border-color: rgba(232,133,106,.25);
}
.olistCardHead,
.archiveItemHead{
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.olistCardTitle{
  font-weight: 600;
}
.olistMetaRow{
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
  flex-wrap: wrap;
}
.olistType{
  font-size: 12px;
  color: var(--accent-strong);
  background: rgba(232,133,106,.12);
  border-radius: 999px;
  padding: 3px 8px;
}
.olistCardDate{
  font-size: 12px;
  color: var(--muted);
}
.olistCardContent{
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}
.olistDelBtn{
  font-size: 12px;
  align-self: flex-end;
}

.archivePanel{
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 12px;
}
.archiveRail{
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}
.archiveRailTitle{
  font-size: 13px;
  font-weight: 700;
}
.archiveDateBtn{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 1px solid transparent;
  background: rgba(255,255,255,.72);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--text);
  text-align: left;
}
.archiveDateBtn.active{
  background: rgba(232,133,106,.12);
  border-color: rgba(232,133,106,.28);
  color: var(--accent-strong);
}
.archiveEmpty{
  padding: 10px 4px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.archiveContent{
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}
.archiveGroups{
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.archiveGroup{
  padding: 14px 16px;
}
.archiveGroupHead{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.archiveGroupTitle{
  font-size: 15px;
  font-weight: 700;
}
.archiveGroupCount{
  font-size: 12px;
  color: var(--muted);
}
.archiveGroupList{
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.archiveItem{
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(255,255,255,.62);
  cursor: pointer;
}

@media (max-width: 960px) {
  .olistHead{
    flex-direction: column;
  }

  .archivePanel{
    grid-template-columns: 1fr;
  }

  .archiveRail{
    max-height: 180px;
  }
}
</style>
