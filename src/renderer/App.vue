<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getEntry, getModelStatus, listEntries, listOnThisDay, regenerateCornie, upsertEntry } from './api'
import CornieComposer from './CornieComposer.vue'
import ChatHistory from './ChatHistory.vue'

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

const mode = ref('diary') // diary | history | cornie-composer

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
    // 往年今日属于增强信息：失败时不打断主流程，只在 UI 上给提示
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
  <div class="app">
    <header class="top">
      <div class="brand">
        <div class="logo">C</div>
        <div>
          <div class="title">
            {{ mode === 'diary' ? 'Cornie · 日记本（MVP）' : 'Cornie · 小窗口拼装（编辑模式）' }}
          </div>
          <div class="subtitle">
            {{
              mode === 'diary'
                ? '本地优先 · 轻量优雅 · 先把“记录”跑通'
                : mode === 'history'
                  ? '按天翻阅聊天记录，不打断实时陪伴感'
                : '拖动部件拼装 Cornie，然后复制配置给我固化到 CSS'
            }}
          </div>
        </div>
      </div>

      <div class="actions">
        <div class="modeTabs">
          <button class="tab" :class="{ active: mode === 'diary' }" @click="mode = 'diary'">日记本</button>
          <button class="tab" :class="{ active: mode === 'history' }" @click="mode = 'history'">聊天记录</button>
          <button
            class="tab"
            :class="{ active: mode === 'cornie-composer' }"
            @click="mode = 'cornie-composer'"
          >
            Cornie 拼装
          </button>
        </div>

        <template v-if="mode === 'diary'">
          <input
            class="month"
            type="month"
            v-model="selectedMonth"
            aria-label="选择月份"
          />
          <button @click="pickDate(toISODate(new Date()))">回到今天</button>
        </template>
      </div>
    </header>

    <div v-if="!modelStatus.ok" class="modelBanner">
      <template v-if="!modelStatus.configured">
        <span>Cornie需要配置 DeepSeek API Key 才能提供 AI 能力。</span>
        <code class="modelCmd">DEEPSEEK_API_KEY=你的密钥</code>
      </template>
      <template v-else>
        <span>DeepSeek 当前不可用，请检查网络、API Key 或模型配置。</span>
        <code class="modelCmd">{{ modelStatus.reason || 'request_failed' }}</code>
      </template>
      <button class="modelRetry" @click="checkModel">重新检测</button>
    </div>

    <main v-if="mode === 'diary'" class="main">
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
            <div class="panelTitle">Cornie 的日记（暂时先占位）</div>
            <textarea
              v-model="entry.cornieText"
              placeholder="点击「生成 Cornie 日记」让Cornie帮你写一篇。"
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
    </main>

    <main v-else-if="mode === 'history'" class="composerMain">
      <ChatHistory />
    </main>

    <main v-else class="composerMain">
      <CornieComposer />
    </main>
  </div>
</template>

<style scoped>
.app{
  height: 100vh;
  display:flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}
.top{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: rgba(255,255,255,.04);
}
.brand{
  display:flex;
  align-items:center;
  gap: 12px;
}
.logo{
  width: 38px;
  height: 38px;
  display:grid;
  place-items:center;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(125,211,252,.12);
  color: var(--accent);
  font-weight: 700;
}
.title{ font-weight: 700; letter-spacing: .2px; }
.subtitle{ font-size: 12px; color: var(--muted); margin-top: 2px; }
.actions{ display:flex; align-items:center; gap: 10px; }
.modeTabs{ display:flex; gap: 8px; padding: 4px; border: 1px solid var(--border); border-radius: 14px; background: rgba(255,255,255,.03); }
.tab{ padding: 8px 10px; border-radius: 12px; border-color: transparent; }
.tab.active{ border-color: rgba(125,211,252,.35); background: rgba(125,211,252,.10); }
.month{
  width: 150px;
}
.main{
  flex:1;
  display:grid;
  grid-template-columns: 260px 1fr;
  gap: 14px;
  min-height: 0;
}
.composerMain{
  flex: 1;
  min-height: 0;
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

.modelBanner{
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  margin: 0 0 -4px;
  border-radius: 14px;
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

@media (max-width: 980px){
  .main{ grid-template-columns: 1fr; }
  .grid{ grid-template-columns: 1fr; }
}
</style>

