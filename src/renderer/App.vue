<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useModelSettings } from './composables/useModelSettings'
import ChatHome from './components/ChatHome.vue'
import ChatDayView from './components/ChatDayView.vue'
import DiaryHome from './components/DiaryHome.vue'
import DiaryEditor from './components/DiaryEditor.vue'
import CornieDiaryReview from './components/CornieDiaryReview.vue'
import OnThisDayPage from './components/OnThisDayPage.vue'
import ObserveMemoryHome from './components/ObserveMemoryHome.vue'
import ObservationList from './components/ObservationList.vue'
import ObservationDetail from './components/ObservationDetail.vue'
import MemoryWikiHome from './components/MemoryWikiHome.vue'
import LedgerHome from './components/LedgerHome.vue'
import TodoHome from './components/TodoHome.vue'
import ScheduleHome from './components/ScheduleHome.vue'
import SettingsHome from './components/SettingsHome.vue'
import DeepseekConfig from './components/DeepseekConfig.vue'
import AdvancedSettings from './components/AdvancedSettings.vue'
import ChatHistory from './ChatHistory.vue'

const sections = [
  { id: 'chat', label: '聊天', hint: '和铃湾说说话', icon: '💬' },
  { id: 'diary', label: '日记', hint: '写下今天的心情', icon: '📔' },
  { id: 'ledger', label: '收支', hint: '轻松记一笔', icon: '💰' },
  { id: 'todo', label: '待办', hint: '今天要做什么', icon: '✅' },
  { id: 'schedule', label: '日程', hint: '接下来的安排', icon: '📅' },
  // R-04：记忆三栏——观察日志 / 当天日记 / 记忆 Wiki 平级入口
  { id: 'observe', label: '观察日志', hint: '今天留下的生活片段', icon: '📝' },
  { id: 'memory', label: '记忆 Wiki', hint: '想留住的长期记忆', icon: '📖' },
  { id: 'settings', label: '设置', hint: '铃湾的连接和偏好', icon: '⚙️' },
]

const mode = ref('chat')
const modeMeta = computed(() => sections.find((item) => item.id === mode.value) || sections[0])

const chatView = ref('home')
const chatHistoryDate = ref('')
const chatFocusMessageId = ref('')

// Diary sub-view
const diaryView = ref('home') // 'home' | 'editor' | 'cornie-review' | 'on-this-day'

// R-04：观察日志与记忆 Wiki 独立子视图栈
const observeView = ref('home') // 'home' | 'observation-list' | 'observation-detail'
const observeDetailId = ref('')
const memoryView = ref('home') // 'home' | 'memory-detail' | 'memory-create'

// Settings sub-view
const settingsView = ref('home') // 'home' | 'deepseek-config' | 'advanced'

const {
  modelStatus,
  modelSettings,
  form: settingsForm,
  saving: settingsSaving,
  loading: settingsLoading,
  errorMsg: settingsError,
  noticeMsg: settingsNotice,
  refresh: refreshModelState,
  check: checkModel,
  submit: submitModelSettings,
} = useModelSettings()

const isGuideVisible = computed(() => !modelStatus.value.configured)

// FE-10：视图切换后焦点落位主内容区（键盘操作连续）。
const mainPanelRef = ref(null)

watch(mode, async () => {
  chatView.value = 'home'
  chatHistoryDate.value = ''
  chatFocusMessageId.value = ''
  diaryView.value = 'home'
  observeView.value = 'home'
  memoryView.value = 'home'
  settingsView.value = 'home'
  await nextTick()
  mainPanelRef.value?.focus()
})

onMounted(async () => {
  await refreshModelState()
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
    <main ref="mainPanelRef" tabindex="-1" class="mainPanel">
      <header class="topBar">
        <div class="topTitle">{{ modeMeta.label }}</div>
        <div class="topHint">{{ modeMeta.hint }}</div>
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
        <ChatHome v-if="chatView === 'home'" @go-history="chatView = 'history'" />
        <ChatHistory
          v-else-if="chatView === 'history'"
          @back="chatView = 'home'"
          @open-date="
            (date) => {
              chatHistoryDate = date
              chatFocusMessageId = ''
              chatView = 'day'
            }
          "
        />
        <ChatDayView
          v-else-if="chatView === 'day'"
          :date="chatHistoryDate"
          :focus-message-id="chatFocusMessageId"
          @back="chatView = 'history'"
        />
      </section>

      <!-- 日记模式 -->
      <section v-else-if="mode === 'diary'" class="contentFrame">
        <DiaryHome v-if="diaryView === 'home'" @go="(v) => (diaryView = v)" @go-observe="mode = 'observe'" />
        <DiaryEditor v-else-if="diaryView === 'editor'" @back="diaryView = 'home'" />
        <CornieDiaryReview v-else-if="diaryView === 'cornie-review'" @back="diaryView = 'home'" />
        <OnThisDayPage v-else-if="diaryView === 'on-this-day'" @back="diaryView = 'home'" />
      </section>

      <!-- 收支模式 -->
      <section v-else-if="mode === 'ledger'" class="contentFrame">
        <LedgerHome />
      </section>

      <!-- 待办模式 -->
      <section v-else-if="mode === 'todo'" class="contentFrame">
        <TodoHome />
      </section>

      <!-- 日程模式 -->
      <section v-else-if="mode === 'schedule'" class="contentFrame">
        <ScheduleHome />
      </section>

      <!-- 观察日志（R-04：三栏之一） -->
      <section v-else-if="mode === 'observe'" class="contentFrame">
        <ObserveMemoryHome
          v-if="observeView === 'home'"
          @go="
            (v, id) => {
              observeView = v
              observeDetailId = id || ''
            }
          "
          @goChat="mode = 'chat'"
        />
        <ObservationList
          v-else-if="observeView === 'observation-list'"
          @back="observeView = 'home'"
          @go="
            (v, id) => {
              observeView = v
              observeDetailId = id || ''
            }
          "
        />
        <ObservationDetail
          v-else-if="observeView === 'observation-detail'"
          :id="observeDetailId"
          @back="observeView = 'observation-list'"
          @deleted="observeView = 'observation-list'"
        />
      </section>

      <!-- 记忆 Wiki（T-02：文件树双栏） -->
      <section v-else-if="mode === 'memory'" class="contentFrame">
        <MemoryWikiHome
          @open-observation="
            (id) => {
              mode = 'observe'
              observeDetailId = id
              observeView = 'observation-detail'
            }
          "
          @open-chat-source="
            ({ date, messageId }) => {
              mode = 'chat'
              chatHistoryDate = date || ''
              chatFocusMessageId = messageId || ''
              chatView = 'day'
            }
          "
        />
      </section>

      <!-- 设置 -->
      <section v-else-if="mode === 'settings'" class="contentFrame">
        <SettingsHome
          v-if="settingsView === 'home'"
          :modelStatus="modelStatus"
          :modelSettings="modelSettings"
          @go="(v) => (settingsView = v)"
        />
        <DeepseekConfig
          v-else-if="settingsView === 'deepseek-config'"
          @back="settingsView = 'home'"
          @updated="refreshModelState()"
        />
        <AdvancedSettings v-else-if="settingsView === 'advanced'" @back="settingsView = 'home'" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.appShell {
  height: 100vh;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
}

/* ─── 导航面板 ─── */
.navPanel {
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.brandBlock {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 8px;
}
.brandTitle {
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
}
.brandSub {
  font-size: 12px;
  color: var(--muted);
}

.navList {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: auto;
  flex: 1;
}

.navItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  width: 100%;
}
.navItem:hover {
  background: var(--surface-2);
}
.navItem.active {
  background: rgba(232, 133, 106, 0.1);
}
.navIcon {
  font-size: 20px;
  flex: 0 0 auto;
}
.navText {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.navLabel {
  font-weight: 700;
  font-size: 14px;
}
.navHint {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.3;
}

.navFooter {
  padding: 10px 14px;
  border-top: 1px solid var(--border);
}
.statusDot {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.statusDot::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.statusDot.ok {
  color: #5b9a6b;
}
.statusDot.ok::before {
  background: #5b9a6b;
}
.statusDot.off {
  color: var(--muted);
}
.statusDot.off::before {
  background: #d6d0c4;
}

/* ─── 主区 ─── */
.mainPanel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
/* FE-10：容器接收焦点但不高亮（内容元素各自有可见焦点）。 */
.mainPanel:focus {
  outline: none;
}

.topBar {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 10px 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
}
.topTitle {
  font-size: 20px;
  font-weight: 800;
}
.topHint {
  color: var(--muted);
  font-size: 12px;
}
.monthInput {
  width: 160px;
}

/* ─── 配网引导横条 ─── */
.guideBanner {
  border: 1px solid rgba(232, 133, 106, 0.25);
  border-radius: 18px;
  background: #fff8f5;
  padding: 24px;
}
.guideBannerInner {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
}
.guideBannerTitle {
  font-size: 18px;
  font-weight: 800;
}
.guideBannerText {
  color: var(--muted);
  line-height: 1.6;
}
.guideBannerForm {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.guideBannerForm input {
  min-width: 0;
}
.guideBannerActions {
  grid-column: 1 / -1;
  display: flex;
  gap: 10px;
}
.guideBannerError {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(217, 106, 92, 0.25);
  background: rgba(217, 106, 92, 0.06);
  color: var(--danger);
  font-size: 13px;
}
.guideBannerNotice {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(91, 154, 107, 0.25);
  background: rgba(91, 154, 107, 0.06);
  color: #5b9a6b;
  font-size: 13px;
}
/* ─── 内容区 ─── */
.contentFrame {
  flex: 1;
  min-height: 0;
}

/* ─── 响应式 ─── */
@media (max-width: 1180px) {
  .appShell {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 100vh;
  }
  .navPanel {
    min-height: auto;
  }
  .navList {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .navList {
    grid-template-columns: 1fr;
  }
  .topBar {
    flex-direction: column;
    align-items: flex-start;
  }
  .guideBannerForm {
    grid-template-columns: 1fr;
  }
}
</style>
