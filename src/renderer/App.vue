<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  clearModelSettings,
  getEntry,
  getModelSettings,
  getModelStatus,
  listEntries,
  listOnThisDay,
  regenerateCornie,
  saveModelSettings,
  upsertEntry
} from './api'
import ChatHome from './components/ChatHome.vue'
import DiaryHome from './components/DiaryHome.vue'
import DiaryEditor from './components/DiaryEditor.vue'
import CornieDiaryReview from './components/CornieDiaryReview.vue'
import OnThisDayPage from './components/OnThisDayPage.vue'
import LedgerWorkspace from './components/LedgerWorkspace.vue'
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
  { id: 'chat',            label: '聊天',       hint: '和铃湾说说话',       icon: '💬' },
  { id: 'diary',           label: '日记',       hint: '写下今天的心情',       icon: '📔' },
  { id: 'ledger',          label: '收支',       hint: '轻松记一笔',           icon: '💰' },
  { id: 'todo',            label: '待办',       hint: '今天要做什么',         icon: '✅' },
  { id: 'schedule',        label: '日程',       hint: '接下来的安排',         icon: '📅' },
  { id: 'observe-memory',  label: '观察与记忆',  hint: '想记住的小事',         icon: '🌟' },
  { id: 'settings',        label: '设置',       hint: '铃湾的连接和偏好',     icon: '⚙️' },
]

const mode = ref('chat')
const modeMeta = computed(() => sections.find((item) => item.id === mode.value) || sections[0])

// Diary sub-view
const diaryView = ref('home') // 'home' | 'editor' | 'cornie-review' | 'on-this-day'

const modelStatus = ref({ ok: false, configured: false, provider: 'deepseek', model: '', reason: '' })
const modelSettings = ref({
  provider: 'deepseek',
  configured: false,
  hasApiKey: false,
  maskedApiKey: '',
  baseUrl: '',
  model: '',
  timeoutMs: null,
  source: 'empty'
})

const settingsForm = ref({
  apiKey: '',
  baseUrl: '',
  model: 'deepseek-chat',
  timeoutMs: '30000'
})
const settingsSaving = ref(false)
const settingsLoading = ref(false)
const settingsError = ref('')
const settingsNotice = ref('')

const isGuideVisible = computed(() => !modelStatus.value.configured)

function toFriendlySettingsError(error) {
  const raw = String(error?.message || error || '').trim()
  if (!raw) return '铃湾刚刚没把设置收好，我们再试一次就好。'
  if (/apiKey is required/i.test(raw)) return 'API Key 这一栏还是空的，铃湾还没拿到钥匙呢。'
  if (/invalid timeout/i.test(raw)) return '超时毫秒要填成正整数呀，比如 30000。'
  if (/http_|request_failed|fetch|network|timeout/i.test(raw))
    return '铃湾刚刚去敲门时没收到顺利回应，可能是网络、地址或者钥匙状态出了点小岔子。'
  return '这次保存没成功，不过别担心，我们检查一下输入内容再试一次就好。'
}

async function refreshModelState() {
  settingsLoading.value = true
  settingsError.value = ''
  try {
    const [statusData, settingsData] = await Promise.all([getModelStatus(), getModelSettings()])
    modelStatus.value = statusData
    modelSettings.value = settingsData.settings
    settingsForm.value = {
      apiKey: '',
      baseUrl: settingsData.settings.baseUrl || '',
      model: settingsData.settings.model || 'deepseek-chat',
      timeoutMs: settingsData.settings.timeoutMs ? String(settingsData.settings.timeoutMs) : '30000'
    }
  } catch {
    modelStatus.value = { ok: false, configured: false, provider: 'deepseek', model: '', reason: 'request_failed' }
    settingsError.value = '铃湾没能连上，我们可以稍后再试。'
  } finally {
    settingsLoading.value = false
  }
}

async function checkModel() {
  try {
    const data = await getModelStatus()
    modelStatus.value = data
  } catch {
    modelStatus.value = { ok: false, configured: false, provider: 'deepseek', model: '', reason: 'request_failed' }
  }
}

async function submitModelSettings() {
  settingsSaving.value = true
  settingsError.value = ''
  settingsNotice.value = ''
  try {
    await saveModelSettings({
      apiKey: settingsForm.value.apiKey,
      baseUrl: settingsForm.value.baseUrl,
      model: settingsForm.value.model,
      timeoutMs: settingsForm.value.timeoutMs
    })
    settingsNotice.value = '铃湾已经把钥匙收好啦，现在去重新确认连接状态。'
    await refreshModelState()
    await checkModel()
  } catch (error) {
    settingsError.value = toFriendlySettingsError(error)
  } finally {
    settingsSaving.value = false
  }
}

async function resetModelSettings() {
  settingsSaving.value = true
  settingsError.value = ''
  settingsNotice.value = ''
  try {
    await clearModelSettings()
    settingsNotice.value = '已经把本地保存的钥匙收起来啦。'
    await refreshModelState()
    await checkModel()
  } catch (error) {
    settingsError.value = toFriendlySettingsError(error)
  } finally {
    settingsSaving.value = false
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

watch(mode, () => {
  diaryView.value = 'home'
})

onMounted(async () => {
  await refreshModelState()
  await refreshList()
  await loadEntry(selectedDate.value)
  await loadOnThisDay(selectedDate.value)
})
</script>

<template>
  <div class="appShell">
    <!-- 左侧导航 -->
    <nav class="navPanel">
      <div class="brandBlock">
        <div class="brandTitle">铃湾</div>
        <div class="brandSub">Cornie</div>
      </div>

      <div class="navList">
        <button
          v-for="section in sections"
          :key="section.id"
          class="navItem"
          :class="{ active: mode === section.id }"
          @click="mode = section.id"
        >
          <span class="navIcon">{{ section.icon }}</span>
          <div class="navText">
            <span class="navLabel">{{ section.label }}</span>
            <span class="navHint">{{ section.hint }}</span>
          </div>
        </button>
      </div>

      <div class="navFooter">
        <div v-if="modelStatus.ok" class="statusDot ok">铃湾在线</div>
        <div v-else class="statusDot off">未连接</div>
      </div>
    </nav>

    <!-- 右侧主区 -->
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

      <!-- 配网引导遮罩 -->
      <section v-if="isGuideVisible" class="guideBanner">
        <div class="guideBannerInner">
          <div class="guideBannerTitle">先把 DeepSeek 的钥匙交给铃湾吧</div>
          <div class="guideBannerText">还没检测到可用钥匙，铃湾需要连上 DeepSeek 才能继续陪你聊天、记日记。</div>
          <form class="guideBannerForm" @submit.prevent="submitModelSettings">
            <input
              v-model="settingsForm.apiKey"
              type="password"
              autocomplete="off"
              placeholder="把你的 API Key 放在这里"
            />
            <input v-model="settingsForm.baseUrl" placeholder="Base URL（可留空）" />
            <input v-model="settingsForm.model" placeholder="模型名（默认 deepseek-chat）" />
            <input v-model="settingsForm.timeoutMs" inputmode="numeric" placeholder="超时毫秒（如 30000）" />
            <div class="guideBannerActions">
              <button class="primary" :disabled="settingsSaving || settingsLoading" type="submit">
                {{ settingsSaving ? '保存中…' : '保存并检测' }}
              </button>
              <button :disabled="settingsSaving || settingsLoading" type="button" @click="checkModel">只检测</button>
            </div>
          </form>
          <div v-if="settingsError" class="guideBannerError">{{ settingsError }}</div>
          <div v-if="settingsNotice" class="guideBannerNotice">{{ settingsNotice }}</div>
        </div>
      </section>

      <!-- 聊天模式 -->
      <section v-else-if="mode === 'chat'" class="contentFrame">
        <ChatHome />
      </section>

      <!-- 日记模式 -->
      <section v-else-if="mode === 'diary'" class="contentFrame">
        <DiaryHome
          v-if="diaryView === 'home'"
          @go="(v) => diaryView = v"
        />
        <DiaryEditor
          v-else-if="diaryView === 'editor'"
          @back="diaryView = 'home'"
        />
        <CornieDiaryReview
          v-else-if="diaryView === 'cornie-review'"
          @back="diaryView = 'home'"
        />
        <OnThisDayPage
          v-else-if="diaryView === 'on-this-day'"
          @back="diaryView = 'home'"
        />
      </section>

      <!-- 收支模式 -->
      <section v-else-if="mode === 'ledger'" class="contentFrame">
        <LedgerWorkspace />
      </section>

      <!-- 待办模式 -->
      <section v-else-if="mode === 'todo'" class="contentFrame">
        <TodoWorkspace />
      </section>

      <!-- 日程模式 -->
      <section v-else-if="mode === 'schedule'" class="contentFrame">
        <ScheduleWorkspace />
      </section>

      <!-- 观察与记忆（占位，task-006 构建） -->
      <section v-else-if="mode === 'observe-memory'" class="contentFrame">
        <div class="placeholderPage">
          <div class="placeholderIcon">🌟</div>
          <div class="placeholderTitle">观察与记忆</div>
          <div class="placeholderHint">观察与记忆首页将在后续步骤构建。</div>
        </div>
      </section>

      <!-- 设置（占位，task-012 构建） -->
      <section v-else-if="mode === 'settings'" class="contentFrame">
        <div class="placeholderPage">
          <div class="placeholderIcon">⚙️</div>
          <div class="placeholderTitle">设置</div>
          <div class="placeholderHint">设置页将在后续步骤构建。</div>
          <div v-if="modelStatus.configured" class="guideBannerReset">
            <span>已保存钥匙：{{ modelSettings.maskedApiKey }}</span>
            <button class="danger" :disabled="settingsSaving" @click="resetModelSettings">清空钥匙</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.appShell{
  height: 100vh;
  display:grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
}

/* ─── 导航面板 ─── */
.navPanel{
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  padding: 16px;
  display:flex;
  flex-direction:column;
  gap: 14px;
  min-height: 0;
}

.brandBlock{
  display:flex;
  align-items:baseline;
  gap: 8px;
  padding: 0 8px;
}
.brandTitle{
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
}
.brandSub{
  font-size: 12px;
  color: var(--muted);
}

.navList{
  display:flex;
  flex-direction:column;
  gap: 6px;
  overflow:auto;
  flex:1;
}

.navItem{
  display:flex;
  align-items:center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  text-align:left;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  width: 100%;
}
.navItem:hover{
  background: var(--surface-2);
}
.navItem.active{
  background: rgba(232,133,106,.10);
}
.navIcon{
  font-size: 20px;
  flex: 0 0 auto;
}
.navText{
  display:flex;
  flex-direction:column;
  gap: 2px;
  min-width: 0;
}
.navLabel{
  font-weight: 700;
  font-size: 14px;
}
.navHint{
  color: var(--muted);
  font-size: 11px;
  line-height: 1.3;
}

.navFooter{
  padding: 10px 14px;
  border-top: 1px solid var(--border);
}
.statusDot{
  font-size: 12px;
  display:flex;
  align-items:center;
  gap: 6px;
}
.statusDot::before{
  content:'';
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.statusDot.ok{ color: #5B9A6B; }
.statusDot.ok::before{ background: #5B9A6B; }
.statusDot.off{ color: var(--muted); }
.statusDot.off::before{ background: #D6D0C4; }

/* ─── 主区 ─── */
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
  padding: 16px 20px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
}
.topTitle{
  font-size: 24px;
  font-weight: 800;
}
.topHint{
  margin-top: 4px;
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

/* ─── 配网引导横条 ─── */
.guideBanner{
  border: 1px solid rgba(232,133,106,.25);
  border-radius: 18px;
  background: #FFF8F5;
  padding: 24px;
}
.guideBannerInner{
  display:flex;
  flex-direction:column;
  gap: 14px;
  max-width: 640px;
}
.guideBannerTitle{
  font-size: 18px;
  font-weight: 800;
}
.guideBannerText{
  color: var(--muted);
  line-height: 1.6;
}
.guideBannerForm{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.guideBannerForm input{
  min-width: 0;
}
.guideBannerActions{
  grid-column: 1 / -1;
  display:flex;
  gap: 10px;
}
.guideBannerError{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  font-size: 13px;
}
.guideBannerNotice{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(91,154,107,.25);
  background: rgba(91,154,107,.06);
  color: #5B9A6B;
  font-size: 13px;
}
.guideBannerReset{
  display:flex;
  align-items:center;
  gap: 12px;
  margin-top: 10px;
  font-size: 13px;
  color: var(--muted);
}

/* ─── 占位页 ─── */
.placeholderPage{
  flex:1;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap: 12px;
  color: var(--muted);
  min-height: 400px;
}
.placeholderIcon{ font-size: 48px; }
.placeholderTitle{ font-size: 20px; font-weight: 700; color: var(--text); }
.placeholderHint{ font-size: 14px; }

/* ─── 内容区 ─── */
.contentFrame{
  flex:1;
  min-height: 0;
}

/* ─── 日记模块（task-005 前临时保留） ─── */
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
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}
.row:hover{ background: var(--surface-2); }
.row.active{
  border-color: rgba(232,133,106,.25);
  background: rgba(232,133,106,.08);
}
.date{ font-variant-numeric: tabular-nums; font-size: 13px; }
.meta{ display:flex; gap: 6px; }
.pill{
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
}
.pill2{ border-color: rgba(232,133,106,.30); color: var(--accent); }
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
}
.otdList{ display:flex; flex-direction: column; gap: 10px; }
.otdItem{
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
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
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  padding: 10px 12px;
  border-radius: 12px;
}
.error{
  margin: 12px 16px 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
}

/* ─── 响应式 ─── */
@media (max-width: 1180px){
  .appShell{
    grid-template-columns: 1fr;
    height: auto;
    min-height: 100vh;
  }
  .navPanel{ min-height: auto; }
  .navList{
    display:grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .diaryGrid{ grid-template-columns: 1fr; }
}
@media (max-width: 760px){
  .navList{ grid-template-columns: 1fr; }
  .topBar{ flex-direction: column; }
  .topActions{ width: 100%; flex-wrap: wrap; }
  .grid{ grid-template-columns: 1fr; }
  .otdGrid{ grid-template-columns: 1fr; }
  .guideBannerForm{ grid-template-columns: 1fr; }
}
</style>
