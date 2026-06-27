<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getEntry, getModelStatus, listEntries, listOnThisDay, regenerateCornie, upsertEntry } from './api'
import CornieComposer from './CornieComposer.vue'
import ChatHistory from './ChatHistory.vue'
import LedgerWorkspace from './components/LedgerWorkspace.vue'
import MemoryWikiWorkspace from './components/MemoryWikiWorkspace.vue'
import TodoWorkspace from './components/TodoWorkspace.vue'
import ScheduleWorkspace from './components/ScheduleWorkspace.vue'

function pad2(n) {
  return String(n).padStart(2, '0')
}
function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function toISOMonth(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

const today = new Date()
const selectedDate = ref(toISODate(today))
const selectedMonth = ref(toISOMonth(today))

const entries = ref([])
const loadingList = ref(false)
const loadingEntry = ref(false)
const loadingOnThisDay = ref(false)
const saving = ref(false)
const regenerating = ref(false)
const errorMsg = ref('')

const entry = ref({
  date: selectedDate.value,
  userText: '',
  cornieText: ''
})
const dirty = ref(false)
const onThisDayItems = ref([])

const selectedLabel = computed(() => selectedDate.value)

const sections = [
  { id: 'diary', label: '日记本', hint: '保留现在的日记与往年今日' },
  { id: 'ledger', label: '收支', hint: '记录收入支出与类目' },
  { id: 'todo', label: '待办', hint: '整理待办与类目' },
  { id: 'schedule', label: '日程', hint: '管理未来安排与类目' },
  { id: 'memory-wiki', label: 'Memory Wiki', hint: '查看长期记忆页面与主题索引' },
  { id: 'history', label: '聊天记录', hint: '按天翻阅聊天历史' },
  { id: 'cornie-composer', label: 'Cornie 拼装', hint: '编辑 Cornie 外观贴图' }
]

const mode = ref('diary')

const modeMeta = computed(() => sections.find((item) => item.id === mode.value) || sections[0])

const modelStatus = ref({ ok: false, configured: false, provider: 'deepseek', model: '', reason: '' })
async function checkModel() {
  try {
    const data = await getModelStatus()
    modelStatus.value = data
  } catch {
    modelStatus.value = { ok: false, configured: false, provider: 'deepseek', model: '', reason: 'request_failed' }
  }
}

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
  loadingEntry.value = true
  errorMsg.value = ''
  try {
    const data = await getEntry(date)
    entry.value = data.entry
    dirty.value = false
  } catch (e) {
    errorMsg.value = e?.message || String(e)
  } finally {
    loadingEntry.value = false
  }
}

async function loadOnThisDay(date) {
  loadingOnThisDay.value = true
  try {
    const data = await listOnThisDay(date, { limit: 10 })
    onThisDayItems.value = data.items || []
  } catch (e) {
    onThisDayItems.value = [{ date: '', userText: '', cornieText: '', __error: e?.message || String(e) }]
  } finally {
    loadingOnThisDay.value = false
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

function pickDate(date) {
  selectedDate.value = date
}

watch(selectedDate, async (d) => {
  await loadEntry(d)
  await loadOnThisDay(d)
})

watch(
  selectedMonth,
  async () => {
    await refreshList()
  },
  { immediate: false }
)

onMounted(async () => {
  checkModel()
  await refreshList()
  await loadEntry(selectedDate.value)
  await loadOnThisDay(selectedDate.value)
})
</script>

<template>
  <div class="appShell">
    <aside class="navPanel">
      <div class="brandBlock">
        <div class="logoMark">C</div>
        <div>
          <div class="brandTitle">Cornie 工作台</div>
          <div class="brandHint">铃湾把日记、收支、待办、日程和聊天都放到一起啦。</div>
        </div>
      </div>

      <nav class="navList">
        <button
          v-for="section in sections"
          :key="section.id"
          class="navItem"
          :class="{ active: mode === section.id }"
          @click="mode = section.id"
        >
          <span class="navLabel">{{ section.label }}</span>
          <span class="navHint">{{ section.hint }}</span>
        </button>
      </nav>
    </aside>

    <main class="mainPanel">
      <header class="topBar">
        <div>
          <div class="topTitle">{{ modeMeta.label }}</div>
          <div class="topHint">{{ modeMeta.hint }}</div>
        </div>

        <div class="topActions" v-if="mode === 'diary'">
          <input class="monthInput" type="month" v-model="selectedMonth" aria-label="选择月份" />
          <button @click="pickDate(toISODate(new Date()))">回到今天</button>
        </div>
      </header>

      <div v-if="!modelStatus.ok" class="modelBanner">
        <template v-if="!modelStatus.configured">
          <span>铃湾现在还没拿到 DeepSeek 的钥匙呢，先把 API Key 配好，我才能认真帮主人做事呀。</span>
          <code class="modelCmd">DEEPSEEK_API_KEY=你的密钥</code>
        </template>
        <template v-else>
          <span>铃湾这会儿没连上 DeepSeek，主人可以检查一下网络、Key 或模型配置。</span>
          <code class="modelCmd">{{ modelStatus.reason || 'request_failed' }}</code>
        </template>
        <button class="modelRetry" @click="checkModel">重新检测</button>
      </div>

      <section v-if="mode === 'diary'" class="contentFrame">
        <div class="diaryGrid">
          <aside class="sidebar card">
            <div class="sidebarHead">
              <div class="sidebarTitle">本月条目</div>
              <div class="sidebarHint" v-if="loadingList">加载中…</div>
              <div class="sidebarHint" v-else>{{ entries.length }} 天有记录</div>
            </div>

            <div class="list">
              <button
                v-for="e in entries"
                :key="e.date"
                class="row"
                :class="{ active: e.date === selectedDate }"
                @click="pickDate(e.date)"
              >
                <div class="date">{{ e.date }}</div>
                <div class="meta">
                  <span v-if="e.hasUserText" class="pill">我的</span>
                  <span v-if="e.hasCornieText" class="pill pill2">Cornie</span>
                </div>
              </button>
            </div>
          </aside>

          <section class="content card">
            <div class="contentHead">
              <div>
                <div class="contentTitle">{{ selectedLabel }}</div>
                <div class="contentHint">
                  {{ loadingEntry ? '加载中…' : dirty ? '未保存更改' : '已同步到本地' }}
                </div>
              </div>
              <div class="contentActions">
                <button :disabled="saving || !dirty" @click="save">
                  {{ saving ? '保存中…' : '保存' }}
                </button>
                <button :disabled="regenerating" @click="regenCornie">
                  {{ regenerating ? '生成中…' : '生成 Cornie 日记' }}
                </button>
              </div>
            </div>

            <div v-if="errorMsg" class="error">
              {{ errorMsg }}
            </div>

            <div class="grid">
              <div class="panel">
                <div class="panelTitle">我的日记（可空）</div>
                <textarea
                  v-model="entry.userText"
                  placeholder="今天发生了什么？写一点也行。"
                  @input="dirty = true"
                />
              </div>

              <div class="panel">
                <div class="panelTitle">Cornie 的日记</div>
                <textarea
                  v-model="entry.cornieText"
                  placeholder="点击「生成 Cornie 日记」让 Cornie 帮你写一篇。"
                  @input="dirty = true"
                />
              </div>

              <div class="panel span2">
                <div class="panelTitle">
                  往年今日
                  <span class="panelHint">{{ loadingOnThisDay ? '加载中…' : '' }}</span>
                </div>

                <div v-if="onThisDayItems.length === 0 && !loadingOnThisDay" class="empty">
                  那时候我还没出生呢，不过现在我在了。
                </div>

                <div v-else class="otdList">
                  <div v-for="it in onThisDayItems" :key="it.date || 'err'" class="otdItem">
                    <div v-if="it.__error" class="otdError">加载失败：{{ it.__error }}</div>
                    <template v-else>
                      <div class="otdDate">{{ it.date }}</div>
                      <div class="otdGrid">
                        <div class="otdCol">
                          <div class="otdLabel">我的</div>
                          <div class="otdText">{{ it.userText || '（空）' }}</div>
                        </div>
                        <div class="otdCol">
                          <div class="otdLabel">Cornie</div>
                          <div class="otdText">{{ it.cornieText || '（空）' }}</div>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section v-else-if="mode === 'ledger'" class="contentFrame">
        <LedgerWorkspace />
      </section>

      <section v-else-if="mode === 'todo'" class="contentFrame">
        <TodoWorkspace />
      </section>

      <section v-else-if="mode === 'schedule'" class="contentFrame">
        <ScheduleWorkspace />
      </section>

      <section v-else-if="mode === 'memory-wiki'" class="contentFrame">
        <MemoryWikiWorkspace />
      </section>

      <section v-else-if="mode === 'history'" class="contentFrame">
        <ChatHistory />
      </section>

      <section v-else class="contentFrame">
        <CornieComposer />
      </section>
    </main>
  </div>
</template>

<style scoped>
.appShell{
  height: 100vh;
  display:grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
}
.navPanel{
  border: 1px solid var(--border);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  padding: 18px;
  display:flex;
  flex-direction:column;
  gap: 18px;
  min-height: 0;
}
.brandBlock{
  display:flex;
  gap: 12px;
  align-items:flex-start;
}
.logoMark{
  width: 42px;
  height: 42px;
  display:grid;
  place-items:center;
  border-radius: 16px;
  background: rgba(125,211,252,.15);
  border: 1px solid rgba(125,211,252,.28);
  color: var(--accent);
  font-weight: 800;
}
.brandTitle{
  font-size: 18px;
  font-weight: 800;
}
.brandHint{
  margin-top: 6px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}
.navList{
  display:flex;
  flex-direction:column;
  gap: 10px;
  overflow:auto;
}
.navItem{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap: 4px;
  padding: 14px 14px;
  border-radius: 18px;
  text-align:left;
}
.navItem.active{
  background: rgba(125,211,252,.14);
  border-color: rgba(125,211,252,.35);
}
.navLabel{
  font-weight: 700;
}
.navHint{
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}
.mainPanel{
  display:flex;
  flex-direction:column;
  gap: 14px;
  min-height: 0;
}
.topBar{
  display:flex;
  align-items:flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: 22px;
  background: rgba(255,255,255,.05);
}
.topTitle{
  font-size: 24px;
  font-weight: 800;
}
.topHint{
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}
.topActions{
  display:flex;
  align-items:center;
  gap: 10px;
}
.monthInput{
  width: 160px;
}
.modelBanner{
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 18px;
  border: 1px solid rgba(251,191,36,.35);
  background: rgba(251,191,36,.08);
  color: rgba(254,243,199,.95);
  font-size: 13px;
  flex-wrap: wrap;
}
.modelCmd{
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(0,0,0,.25);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  white-space: nowrap;
}
.modelRetry{
  margin-left: auto;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 8px;
  border: 1px solid rgba(251,191,36,.35);
  background: rgba(251,191,36,.12);
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.modelRetry:hover{ background: rgba(251,191,36,.20); }
.contentFrame{
  flex:1;
  min-height: 0;
}
.diaryGrid{
  height: 100%;
  display:grid;
  grid-template-columns: 260px 1fr;
  gap: 14px;
}
.sidebar{
  display:flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebarHead{
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--border);
}
.sidebarTitle{ font-weight: 700; }
.sidebarHint{ font-size: 12px; color: var(--muted); margin-top: 4px; }
.list{
  overflow: auto;
  padding: 10px;
  display:flex;
  flex-direction: column;
  gap: 8px;
}
.row{
  width:100%;
  text-align:left;
  display:flex;
  justify-content: space-between;
  align-items:center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
}
.row.active{
  border-color: rgba(125,211,252,.35);
  background: rgba(125,211,252,.10);
}
.date{ font-variant-numeric: tabular-nums; font-size: 13px; }
.meta{ display:flex; gap: 6px; }
.pill{
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
}
.pill2{ color: rgba(167,139,250,.9); }
.content{
  display:flex;
  flex-direction: column;
  overflow:hidden;
}
.contentHead{
  padding: 14px 16px;
  display:flex;
  align-items:flex-start;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--border);
}
.contentTitle{ font-weight: 800; }
.contentHint{ margin-top: 4px; font-size: 12px; color: var(--muted); }
.contentActions{ display:flex; gap: 10px; }
.grid{
  padding: 16px;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  overflow:auto;
}
.panel{
  display:flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.panelTitle{ font-weight: 700; }
.panelHint{ font-weight: 500; font-size: 12px; color: var(--muted); margin-left: 8px; }
.span2{ grid-column: 1 / -1; }
.empty{
  padding: 10px 12px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  color: var(--muted);
  background: rgba(255,255,255,.02);
}
.otdList{
  display:flex;
  flex-direction: column;
  gap: 10px;
}
.otdItem{
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  background: rgba(255,255,255,.02);
}
.otdDate{ font-weight: 700; font-variant-numeric: tabular-nums; margin-bottom: 8px; }
.otdGrid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-width: 0;
}
.otdCol{ min-width: 0; }
.otdLabel{ font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.otdText{
  white-space: pre-wrap;
  line-height: 1.45;
  max-height: 180px;
  overflow: auto;
  padding-right: 6px;
}
.otdError{
  border: 1px solid rgba(248,113,113,.35);
  background: rgba(248,113,113,.08);
  color: rgba(254,226,226,.95);
  padding: 10px 12px;
  border-radius: 12px;
}
.error{
  margin: 12px 16px 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(248,113,113,.35);
  background: rgba(248,113,113,.08);
  color: rgba(254,226,226,.95);
}
@media (max-width: 1180px){
  .appShell{
    grid-template-columns: 1fr;
    height: auto;
    min-height: 100vh;
  }
  .navPanel{
    min-height: auto;
  }
  .navList{
    display:grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .diaryGrid{
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px){
  .navList{
    grid-template-columns: 1fr;
  }
  .topBar{
    flex-direction: column;
  }
  .topActions{
    width: 100%;
    flex-wrap: wrap;
  }
  .grid{
    grid-template-columns: 1fr;
  }
  .otdGrid{
    grid-template-columns: 1fr;
  }
}
</style>
