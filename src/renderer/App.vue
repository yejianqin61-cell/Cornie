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
const guideTitle = computed(() => {
  if (!modelStatus.value.configured) return '先把 DeepSeek 的钥匙交给铃湾吧'
  return '铃湾暂时没连上 DeepSeek'
})
const guideReason = computed(() => {
  if (!modelStatus.value.configured) {
    return '现在还没检测到可用的 DeepSeek API Key。只要先把钥匙放好，铃湾就能继续陪你记日记、记账、写待办。'
  }
  return '钥匙已经在了，但铃湾这会儿没顺利连上 DeepSeek。我们可以先检查一下网络、地址、模型名，或者重新试一遍。'
})
const statusHint = computed(() => {
  if (modelStatus.value.ok) {
    return '已经连上啦，铃湾现在可以安心开工。'
  }
  if (!modelStatus.value.configured) {
    return '先把钥匙放好，铃湾才能继续帮主人处理事情。'
  }
  return '钥匙在，但连接还没顺过来。我们可以先按下面的小提示排查一下。'
})
const recoveryTips = computed(() => {
  if (!modelStatus.value.configured) {
    return [
      '先确认 API Key 已经完整贴进来，不要漏掉开头或结尾。',
      '如果你有自定义地址，也一起填上；没有的话，Base URL 留空就好。',
      '点一下“保存并重新检测”，让铃湾再试一次。'
    ]
  }

  if (modelStatus.value.reason === 'request_failed') {
    return [
      '先看看当前网络是不是正常。',
      '如果你用了代理或自定义地址，确认它现在还能访问。',
      '重新检测一次；如果还是不行，再检查钥匙有没有过期。'
    ]
  }

  return [
    '确认 API Key、Base URL、模型名有没有填错。',
    '如果你刚换过钥匙，可以先清空再重新保存一次。',
    '重试前不用着急，铃湾会一直在这里等你。'
  ]
})

function toFriendlySettingsError(error) {
  const raw = String(error?.message || error || '').trim()
  if (!raw) {
    return '铃湾刚刚没把设置收好，我们再试一次就好。'
  }
  if (/apiKey is required/i.test(raw)) {
    return 'API Key 这一栏还是空的，铃湾还没拿到钥匙呢。'
  }
  if (/invalid timeout/i.test(raw)) {
    return '超时毫秒要填成正整数呀，比如 30000。'
  }
  if (/http_|request_failed|fetch|network|timeout/i.test(raw)) {
    return '铃湾刚刚去敲门时没收到顺利回应，可能是网络、地址或者钥匙状态出了点小岔子。'
  }
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
  } catch (error) {
    modelStatus.value = { ok: false, configured: false, provider: 'deepseek', model: '', reason: 'request_failed' }
    settingsError.value = toFriendlySettingsError(error)
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
  await refreshModelState()
  await refreshList()
  await loadEntry(selectedDate.value)
  await loadOnThisDay(selectedDate.value)
})
</script>

<template>
  <div class="appShell" :class="{ guided: isGuideVisible }">
    <aside class="navPanel" :class="{ disabled: isGuideVisible }">
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
          :disabled="isGuideVisible"
          @click="mode = section.id"
        >
          <span class="navLabel">{{ section.label }}</span>
          <span class="navHint">{{ section.hint }}</span>
        </button>
      </nav>
    </aside>

    <main class="mainPanel" :class="{ disabled: isGuideVisible }">
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

      <div v-if="modelStatus.ok && modelSettings.configured" class="modelSummary">
        <span>铃湾已经拿到钥匙啦，当前模型是 {{ modelStatus.model || modelSettings.model || 'deepseek-chat' }}。</span>
        <span v-if="modelSettings.maskedApiKey">已保存：{{ modelSettings.maskedApiKey }}</span>
        <button class="modelRetry" @click="refreshModelState">刷新状态</button>
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

    <section v-if="isGuideVisible" class="guideOverlay">
      <div class="guideCard">
        <div class="guideEyebrow">DeepSeek 引导</div>
        <h1 class="guideTitle">{{ guideTitle }}</h1>
        <p class="guideText">{{ guideReason }}</p>
        <div class="guideStatus">{{ statusHint }}</div>

        <div class="guideInfo">
          <div class="guideInfoCard">
            <div class="guideInfoTitle">铃湾会怎么用这把钥匙？</div>
            <div class="guideInfoText">用来连接 DeepSeek，帮主人聊天、生成 Cornie 日记、理解工具调用结果。</div>
          </div>
          <div class="guideInfoCard">
            <div class="guideInfoTitle">哪些内容会出门？</div>
            <div class="guideInfoText">你发给铃湾的对话内容、生成请求，以及为了完成任务必须发送给模型的上下文。</div>
          </div>
          <div class="guideInfoCard">
            <div class="guideInfoTitle">联网和隐私要知道什么？</div>
            <div class="guideInfoText">只要开始调用模型，请求就会发往 DeepSeek。铃湾会尽量少带无关内容，但这一步不是纯离线能力。</div>
          </div>
        </div>

        <div class="guideTips">
          <div class="guideTipsTitle">如果还是连不上，可以先这样试试：</div>
          <ul class="guideTipsList">
            <li v-for="tip in recoveryTips" :key="tip">{{ tip }}</li>
          </ul>
        </div>

        <form class="guideForm" @submit.prevent="submitModelSettings">
          <label>
            <span>DeepSeek API Key</span>
            <input
              v-model="settingsForm.apiKey"
              type="password"
              autocomplete="off"
              placeholder="把你的钥匙放在这里"
            />
          </label>
          <label>
            <span>Base URL</span>
            <input v-model="settingsForm.baseUrl" placeholder="默认可留空，或填写自定义地址" />
          </label>
          <label>
            <span>模型名</span>
            <input v-model="settingsForm.model" placeholder="默认是 deepseek-chat" />
          </label>
          <label>
            <span>超时毫秒</span>
            <input v-model="settingsForm.timeoutMs" inputmode="numeric" placeholder="例如 30000" />
          </label>

          <div class="guideCurrent" v-if="modelSettings.maskedApiKey">
            当前已保存：{{ modelSettings.maskedApiKey }}
          </div>
          <div class="guideError" v-if="settingsError">{{ settingsError }}</div>
          <div class="guideNotice" v-if="settingsNotice">{{ settingsNotice }}</div>

          <div class="guideActions">
            <button :disabled="settingsSaving || settingsLoading" type="submit">
              {{ settingsSaving ? '保存中…' : '保存并重新检测' }}
            </button>
            <button class="ghostBtn" :disabled="settingsSaving || settingsLoading" type="button" @click="checkModel">
              只重新检测
            </button>
            <button
              v-if="modelSettings.configured"
              class="ghostBtn dangerBtn"
              :disabled="settingsSaving || settingsLoading"
              type="button"
              @click="resetModelSettings"
            >
              清空已保存钥匙
            </button>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>

<style scoped>
.appShell{
  height: 100vh;
  display:grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
  position: relative;
}
.appShell.guided{
  background:
    radial-gradient(circle at top left, rgba(253,224,71,.10), transparent 36%),
    radial-gradient(circle at bottom right, rgba(125,211,252,.12), transparent 42%);
}
.disabled{
  pointer-events: none;
  filter: blur(8px) saturate(.8);
  opacity: .28;
  user-select: none;
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
.modelSummary{
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 18px;
  border: 1px solid rgba(125,211,252,.28);
  background: rgba(125,211,252,.08);
  color: rgba(224,242,254,.95);
  font-size: 13px;
  flex-wrap: wrap;
}
.modelRetry{
  margin-left: auto;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 8px;
  border: 1px solid rgba(125,211,252,.35);
  background: rgba(125,211,252,.12);
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.modelRetry:hover{ background: rgba(125,211,252,.20); }
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
.guideOverlay{
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 28px;
}
.guideCard{
  width: min(980px, 100%);
  border-radius: 30px;
  border: 1px solid rgba(251,191,36,.26);
  background:
    linear-gradient(160deg, rgba(251,191,36,.09), rgba(15,23,42,.90) 42%),
    rgba(15,23,42,.92);
  box-shadow: 0 28px 80px rgba(15,23,42,.45);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.guideEyebrow{
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: rgba(253,224,71,.78);
}
.guideTitle{
  margin: 0;
  font-size: 34px;
  line-height: 1.1;
}
.guideText{
  margin: 0;
  color: rgba(226,232,240,.88);
  line-height: 1.7;
  max-width: 760px;
}
.guideStatus{
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
  padding: 12px 14px;
  color: rgba(248,250,252,.94);
}
.guideInfo{
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.guideInfoCard{
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 18px;
  background: rgba(255,255,255,.04);
  padding: 16px;
}
.guideInfoTitle{
  font-weight: 800;
  font-size: 14px;
}
.guideInfoText{
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--muted);
}
.guideTips{
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 18px;
  background: rgba(255,255,255,.03);
  padding: 16px;
}
.guideTipsTitle{
  font-size: 14px;
  font-weight: 800;
}
.guideTipsList{
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--muted);
  line-height: 1.7;
}
.guideForm{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.guideForm label{
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.guideCurrent,
.guideError,
.guideNotice{
  grid-column: 1 / -1;
  border-radius: 14px;
  padding: 12px 14px;
}
.guideCurrent{
  border: 1px solid rgba(125,211,252,.28);
  background: rgba(125,211,252,.08);
  color: rgba(224,242,254,.95);
}
.guideError{
  border: 1px solid rgba(248,113,113,.35);
  background: rgba(248,113,113,.08);
  color: rgba(254,226,226,.95);
}
.guideNotice{
  border: 1px solid rgba(74,222,128,.28);
  background: rgba(74,222,128,.08);
  color: rgba(220,252,231,.95);
}
.guideActions{
  grid-column: 1 / -1;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.ghostBtn{
  background: rgba(255,255,255,.05);
}
.dangerBtn{
  border-color: rgba(248,113,113,.35);
  color: rgba(254,202,202,.95);
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
@media (max-width: 960px){
  .guideInfo,
  .guideForm{
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
  .guideCard{
    padding: 20px;
  }
  .guideTitle{
    font-size: 28px;
  }
}
</style>
