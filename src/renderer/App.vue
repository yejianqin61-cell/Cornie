<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useModelSettings } from './composables/useModelSettings'

// F-05：导航由路由驱动（router.js 是唯一事实源）；本文件只保留壳层
// （左侧导航 + 顶部栏 + RouterView + 配网引导）与跨模块跳转接线。
const router = useRouter()
const route = useRoute()

const sections = [
  { path: '/chat', label: '聊天', hint: '和铃湾说说话', icon: '💬' },
  { path: '/diary', label: '日记', hint: '写下今天的心情', icon: '📔' },
  { path: '/ledger', label: '收支', hint: '轻松记一笔', icon: '💰' },
  { path: '/todo', label: '待办', hint: '今天要做什么', icon: '✅' },
  { path: '/schedule', label: '日程', hint: '接下来的安排', icon: '📅' },
  // R-04：记忆三栏——观察日志 / 当天日记 / 记忆 Wiki 平级入口
  { path: '/observe', label: '观察日志', hint: '今天留下的生活片段', icon: '📝' },
  { path: '/memory', label: '记忆 Wiki', hint: '想留住的长期记忆', icon: '📖' },
  { path: '/settings', label: '设置', hint: '铃湾的连接和偏好', icon: '⚙️' },
]

const modeMeta = computed(() => sections.find((item) => route.path.startsWith(item.path)) || sections[0])

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

watch(
  () => route.path,
  async () => {
    await nextTick()
    mainPanelRef.value?.focus()
  }
)

onMounted(async () => {
  await refreshModelState()
})

// ─── 子视图事件 → 路由（保持组件 emit 契约不变，接线集中在本文件） ───
function handleBack() {
  const path = route.path
  if (path.startsWith('/chat/day')) router.push('/chat/history')
  else if (path.startsWith('/chat/history')) router.push('/chat')
  else if (path.startsWith('/diary/')) router.push('/diary')
  else if (path.startsWith('/observe/detail')) router.push('/observe/list')
  else if (path.startsWith('/observe/')) router.push('/observe')
  else if (path.startsWith('/settings/')) router.push('/settings')
  else router.push('/chat')
}

function handleGo(view, id) {
  if (view === 'observation-list') router.push('/observe/list')
  else if (view === 'observation-detail') router.push({ path: `/observe/detail/${id}` })
  else if (view === 'editor') router.push('/diary/editor')
  else if (view === 'cornie-review') router.push('/diary/cornie-review')
  else if (view === 'on-this-day') router.push('/diary/on-this-day')
}

const navHandlers = {
  'go-history': () => router.push('/chat/history'),
  back: handleBack,
  'open-date': (date) => router.push({ path: `/chat/day/${date || ''}` }),
  go: handleGo,
  'go-observe': () => router.push('/observe'),
  'go-chat': () => router.push('/chat'),
  'open-observation': (id) => router.push({ path: `/observe/detail/${id}` }),
  'open-chat-source': ({ date, messageId }) =>
    date ? router.push({ path: `/chat/day/${date}`, query: { focus: messageId || '' } }) : router.push('/chat/history'),
  deleted: () => router.push('/observe/list'),
  updated: () => refreshModelState(),
}

// 路由组件额外 props（仅设置首页需要 App 持有的模型状态）
const routeExtraProps = computed(() =>
  route.path === '/settings' ? { modelStatus: modelStatus.value, modelSettings: modelSettings.value } : {}
)
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
          :key="section.path"
          class="navItem"
          :class="{ active: route.path.startsWith(section.path) }"
          @click="router.push(section.path)"
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

      <!-- 路由视图：子视图事件经 navHandlers 接线到 router.push -->
      <section v-else class="contentFrame">
        <RouterView v-slot="{ Component }">
          <component :is="Component" v-bind="routeExtraProps" v-on="navHandlers" />
        </RouterView>
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
