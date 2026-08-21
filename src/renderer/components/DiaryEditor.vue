<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getEntry, listEntries, listOnThisDay, regenerateCornie, upsertEntry } from '../api'
import { useRequestGuard } from '../composables/useRequestGuard'

// FE-05：切换日期时旧响应不得覆盖新日期内容。
const editorGuard = useRequestGuard()

function pad2(n) { return String(n).padStart(2, '0') }
function toISODate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
function toISOMonth(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}` }

const today = new Date()
const selectedDate = ref(toISODate(today))
const selectedMonth = ref(toISOMonth(today))

const entries = ref([])
const entry = ref({ userText: '', cornieText: '' })
const onThisDayItems = ref([])
const loadingList = ref(false)
const loadingEntry = ref(false)
const loadingOtd = ref(false)
const saving = ref(false)
const regenerating = ref(false)
const errorMsg = ref('')
const dirty = ref(false)

const selectedLabel = computed(() => selectedDate.value)

async function refreshList() {
  loadingList.value = true
  errorMsg.value = ''
  try {
    const data = await listEntries({ month: selectedMonth.value })
    entries.value = data.entries
  } catch (e) {
    errorMsg.value = e?.message || String(e)
  } finally {
    loadingList.value = false
  }
}

async function loadEntry(date) {
  const { token, signal } = editorGuard.begin('entry')
  loadingEntry.value = true
  errorMsg.value = ''
  try {
    const data = await getEntry(date, { signal })
    if (!editorGuard.isCurrent('entry', token)) return
    entry.value = data.entry
    dirty.value = false
  } catch (e) {
    if (!editorGuard.isCurrent('entry', token)) return
    errorMsg.value = e?.message || String(e)
  } finally {
    if (editorGuard.isCurrent('entry', token)) {
      loadingEntry.value = false
      editorGuard.end('entry', token)
    }
  }
}

async function loadOnThisDay(date) {
  loadingOtd.value = true
  try {
    const data = await listOnThisDay(date, { limit: 10 })
    onThisDayItems.value = data.items || []
  } catch (e) {
    onThisDayItems.value = [{ date: '', userText: '', cornieText: '', __error: e?.message || String(e) }]
  } finally {
    loadingOtd.value = false
  }
}

async function save() {
  saving.value = true
  errorMsg.value = ''
  try {
    const data = await upsertEntry(selectedDate.value, {
      userText: entry.value.userText,
      cornieText: entry.value.cornieText
    })
    entry.value = data.entry
    dirty.value = false
    await refreshList()
  } catch (e) {
    errorMsg.value = e?.message || String(e)
  } finally {
    saving.value = false
  }
}

async function regenCornie() {
  regenerating.value = true
  errorMsg.value = ''
  try {
    const data = await regenerateCornie(selectedDate.value)
    entry.value = data.entry
    await refreshList()
  } catch (e) {
    errorMsg.value = e?.message || String(e)
  } finally {
    regenerating.value = false
  }
}

function pickDate(date) { selectedDate.value = date }

watch(selectedDate, (d) => { loadEntry(d); loadOnThisDay(d) })
watch(selectedMonth, () => refreshList(), { immediate: false })

onMounted(async () => {
  await refreshList()
  await loadEntry(selectedDate.value)
  await loadOnThisDay(selectedDate.value)
})
</script>

<template>
  <div class="editor">
    <button class="ghost backBtn" @click="$emit('back')">← 返回日记首页</button>

    <!-- 顶栏 -->
    <div class="topBar card">
      <div>
        <div class="topTitle">{{ selectedLabel }}</div>
        <div class="topHint">{{ loadingEntry ? '加载中…' : dirty ? '未保存更改' : '已同步' }}</div>
      </div>
      <div class="topActions">
        <input class="monthInput" type="month" v-model="selectedMonth" />
        <button @click="pickDate(toISODate(new Date()))">回到今天</button>
        <button class="primary" :disabled="saving || !dirty" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
        <button :disabled="regenerating" @click="regenCornie">
          {{ regenerating ? '生成中…' : '让铃湾写一篇' }}
        </button>
      </div>
    </div>

    <div v-if="errorMsg" class="errorMsg">{{ errorMsg }}</div>

    <!-- 主区 -->
    <div class="editorMain">
      <!-- 侧边栏 -->
      <aside class="dateSidebar card">
        <div class="sidebarHead">
          <div class="sidebarTitle">本月条目</div>
          <div class="sidebarHint" v-if="loadingList">加载中…</div>
          <div class="sidebarHint" v-else>{{ entries.length }} 天有记录</div>
        </div>
        <div class="sidebarList">
          <button
            v-for="e in entries"
            :key="e.date"
            class="dateRow"
            :class="{ active: e.date === selectedDate }"
            @click="pickDate(e.date)"
          >
            <span>{{ e.date }}</span>
            <span class="datePills">
              <span v-if="e.hasUserText" class="dp dp1">我的</span>
              <span v-if="e.hasCornieText" class="dp dp2">Cornie</span>
            </span>
          </button>
        </div>
      </aside>

      <!-- 编辑区 -->
      <div class="editorContent">
        <div class="editPanel card">
          <div class="editPanelTitle">我的日记</div>
          <textarea
            v-model="entry.userText"
            placeholder="今天发生了什么？写一点也行。"
            @input="dirty = true"
          />
        </div>

        <div class="editPanel card">
          <div class="editPanelTitle">Cornie 的日记</div>
          <textarea
            v-model="entry.cornieText"
            placeholder="点击「让铃湾写一篇」让铃湾帮你写。"
            @input="dirty = true"
          />
        </div>

        <!-- 往年今日 -->
        <div class="otdPanel card">
          <div class="editPanelTitle">
            往年今日
            <span class="editPanelHint">{{ loadingOtd ? '加载中…' : '' }}</span>
          </div>
          <div v-if="onThisDayItems.length === 0 && !loadingOtd" class="otdEmpty">
            那时候我还没出生呢，不过现在我在了。
          </div>
          <div v-else class="otdList">
            <div v-for="it in onThisDayItems" :key="it.date || 'err'" class="otdItem">
              <div v-if="it.__error" class="otdErr">加载失败：{{ it.__error }}</div>
              <template v-else>
                <div class="otdDate">{{ it.date }}</div>
                <div class="otdGrid">
                  <div><span class="otdL">我的</span>{{ it.userText || '（空）' }}</div>
                  <div><span class="otdL">Cornie</span>{{ it.cornieText || '（空）' }}</div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}
.backBtn{ align-self: flex-start; }

.topBar{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  flex-wrap: wrap;
}
.topTitle{ font-size: 20px; font-weight: 800; }
.topHint{ margin-top: 4px; font-size: 12px; color: var(--muted); }
.topActions{ display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.monthInput{ width: 140px; }

.errorMsg{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  font-size: 13px;
}

.editorMain{
  flex: 1;
  display: grid;
  grid-template-columns: 230px 1fr;
  gap: 14px;
  min-height: 0;
}

.dateSidebar{ display: flex; flex-direction: column; overflow: hidden; }
.sidebarHead{ padding: 12px 14px 8px; border-bottom: 1px solid var(--border); }
.sidebarTitle{ font-weight: 700; font-size: 14px; }
.sidebarHint{ font-size: 11px; color: var(--muted); margin-top: 3px; }
.sidebarList{
  flex: 1; overflow-y: auto; padding: 8px;
  display: flex; flex-direction: column; gap: 4px;
}
.sidebarList::-webkit-scrollbar{ width: 3px; }
.sidebarList::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.dateRow{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 12px;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
}
.dateRow:hover{ background: var(--surface-2); }
.dateRow.active{
  border-color: rgba(232,133,106,.25);
  background: rgba(232,133,106,.08);
}
.datePills{ display: flex; gap: 4px; }
.dp{ font-size: 10px; padding: 1px 6px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); }
.dp2{ border-color: rgba(232,133,106,.30); color: var(--accent); }

.editorContent{
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 2px;
}
.editorContent::-webkit-scrollbar{ width: 4px; }
.editorContent::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.editPanel{ padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.editPanelTitle{ font-weight: 700; font-size: 15px; }
.editPanelHint{ font-weight: 400; font-size: 12px; color: var(--muted); margin-left: 6px; }

.otdPanel{ padding: 16px; }
.otdEmpty{ color: var(--muted); font-size: 13px; padding: 8px 0; }
.otdList{ display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.otdItem{ padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; }
.otdDate{ font-weight: 700; font-size: 13px; margin-bottom: 6px; }
.otdGrid{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
.otdL{ font-size: 11px; color: var(--muted); display: block; margin-bottom: 2px; }
.otdErr{ color: var(--danger); font-size: 12px; }

@media (max-width: 900px){
  .editorMain{ grid-template-columns: 1fr; }
  .otdGrid{ grid-template-columns: 1fr; }
}
</style>
