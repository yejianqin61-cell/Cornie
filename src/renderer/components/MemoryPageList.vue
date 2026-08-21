<script setup>
import { computed, onMounted, ref } from 'vue'
import { listMemoryWikiPages } from '../api'

// R-04：作为记忆 Wiki home 时隐藏返回按钮（无上级页面）
const props = defineProps({
  showBack: { type: Boolean, default: true }
})
const emit = defineEmits(['back', 'go'])

const IDENTITY_MEMORY_PAGE_TYPES = new Set([
  'identity_profile',
  'identity_preference',
  'identity_trait',
  'identity_person'
])

const PAGE_TYPE_LABELS = {
  identity_profile: '关于你',
  identity_person: '重要的人',
  identity_preference: '你的偏好',
  identity_trait: '你的特征'
}

const PAGE_TYPE_ICONS = {
  identity_profile: '✨',
  identity_person: '👤',
  identity_preference: '👍',
  identity_trait: '🧩'
}

const ORDINARY_PAGE_TYPE_LABELS = {
  event: '生活事件',
  topic: '主题',
  goal: '目标',
  project: '项目',
  routine: '习惯',
  need: '需要',
  preference: '偏好',
  dislike: '不喜欢',
  person: '人物'
}

const GROUP_DEFINITIONS = [
  {
    key: 'identity_profile',
    title: '关于你',
    icon: '✨',
    hint: '这里放着铃湾最想认真记住的你。名字、关系、近况，都会慢慢收在这里。',
    emptyText: '这里还没有“关于你”的长期记忆。'
  },
  {
    key: 'identity_person',
    title: '重要的人',
    icon: '👤',
    hint: '你在意的人、想记住的人、和他们有关的共同经历，都可以留在这里。',
    emptyText: '你还没有写下特别想记住的人。'
  },
  {
    key: 'identity_preference',
    title: '你的偏好',
    icon: '👍',
    hint: '喜欢什么、不喜欢什么、怎样会让你舒服一点，铃湾都会慢慢学。',
    emptyText: '铃湾还在慢慢认识你的喜欢与不喜欢。'
  },
  {
    key: 'identity_trait',
    title: '你的特征',
    icon: '🧩',
    hint: '你的习惯、表达方式、面对压力时的样子，也值得被好好记住。',
    emptyText: '这里还没有记下你的习惯和特征。'
  }
]

const ORDINARY_GROUP = {
  key: 'other',
  title: '其他记忆',
  icon: '📌',
  hint: '想记住的事、主题、目标和计划，都可以单独留一页慢慢看。',
  emptyText: '这里还没有其他想单独留一页的记忆。'
}

const pages = ref([])
const loading = ref(false)
const errorMsg = ref('')
const loadingMore = ref(false)
const hasMore = ref(false)
const pageSize = 20

// R-05：类型 Tab——全部 / 身份 4 类 / 其他记忆（普通类型不再只并进"其他"一锅端）
const PAGE_TYPE_TABS = [
  { key: '', label: '全部' },
  { key: 'identity_profile', label: '关于你' },
  { key: 'identity_person', label: '重要的人' },
  { key: 'identity_preference', label: '你的偏好' },
  { key: 'identity_trait', label: '你的特征' },
  { key: 'other', label: '其他记忆' }
]
const activeType = ref('')

const profileCount = computed(() => pages.value.filter((page) => page.pageType === 'identity_profile').length)
const personCount = computed(() => pages.value.filter((page) => page.pageType === 'identity_person').length)
const preferenceAndTraitCount = computed(() =>
  pages.value.filter((page) => page.pageType === 'identity_preference' || page.pageType === 'identity_trait').length
)

const groupedSections = computed(() => [
  ...GROUP_DEFINITIONS.map((group) => ({
    ...group,
    pages: pages.value.filter((page) => page.pageType === group.key)
  })),
  {
    ...ORDINARY_GROUP,
    pages: pages.value.filter((page) => !IDENTITY_MEMORY_PAGE_TYPES.has(page.pageType))
  }
])

function sortByUpdatedDesc(list) {
  return [...list].sort((a, b) => String(b?.updatedAt || b?.createdAt || '').localeCompare(String(a?.updatedAt || a?.createdAt || '')))
}

async function refresh() {
  loading.value = true
  errorMsg.value = ''
  try {
    // R-05：分页拉取；'other' Tab 拉全部后前端过滤普通类型（普通类型量小，可接受）
    const data = await listMemoryWikiPages({
      status: 'active',
      pageType: activeType.value && activeType.value !== 'other' ? activeType.value : undefined,
      limit: pageSize,
      offset: 0
    })
    let items = data?.pages || []
    if (activeType.value === 'other') {
      items = items.filter((page) => !IDENTITY_MEMORY_PAGE_TYPES.has(page.pageType))
    }
    pages.value = sortByUpdatedDesc(items)
    hasMore.value = items.length === pageSize
  } catch (e) {
    errorMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const data = await listMemoryWikiPages({
      status: 'active',
      pageType: activeType.value && activeType.value !== 'other' ? activeType.value : undefined,
      limit: pageSize,
      offset: pages.value.length
    })
    let items = data?.pages || []
    if (activeType.value === 'other') {
      items = items.filter((page) => !IDENTITY_MEMORY_PAGE_TYPES.has(page.pageType))
    }
    pages.value = sortByUpdatedDesc([...pages.value, ...items])
    hasMore.value = items.length === pageSize
  } catch (e) {
    errorMsg.value = e?.message || '加载失败'
  } finally {
    loadingMore.value = false
  }
}

function selectType(key) {
  if (activeType.value === key) return
  activeType.value = key
  refresh()
}

function truncated(text, maxLen = 100) {
  if (!text) return ''
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}

function pageTypeLabel(pageType) {
  return PAGE_TYPE_LABELS[pageType] || ORDINARY_PAGE_TYPE_LABELS[pageType] || '长期记忆'
}

function pageTypeIcon(pageType) {
  return PAGE_TYPE_ICONS[pageType] || '📌'
}

function cardSummary(page) {
  return truncated(page.summary || page.content || '铃湾先把这页记忆放在这里，等你以后再慢慢补充。', 120)
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('zh-CN')
}

onMounted(refresh)
</script>

<template>
  <div class="mlist">
    <header class="mlistHead">
      <button v-if="showBack" class="ghost" @click="$emit('back')">← 返回</button>
      <div class="mlistHeadMain">
        <div class="mlistTitle">我的记忆</div>
        <div class="mlistHint">铃湾把关于你的重要事情，慢慢收在了这里。</div>
      </div>
      <button class="primary" @click="$emit('go', 'memory-create')">新建记忆</button>
    </header>

    <!-- R-05：类型 Tab（册子化翻阅） -->
    <div class="mlistTabs">
      <button
        v-for="tab in PAGE_TYPE_TABS"
        :key="tab.key"
        class="mlistTab"
        :class="{ active: activeType === tab.key }"
        type="button"
        @click="selectType(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="errorMsg" class="mlistError">{{ errorMsg }}</div>
    <div v-if="loading" class="mlistLoading">翻翻记忆…</div>

    <div v-else-if="pages.length === 0" class="mlistEmpty">
      <div class="mlistEmptyIcon">📝</div>
      <div class="mlistEmptyTitle">铃湾还在慢慢记住关于你的事</div>
      <div class="mlistEmptyHint">先写下一页记忆，或者多和铃湾聊聊天，她会一点点把重要的东西留下来。</div>
      <button class="primary mlistEmptyAction" @click="$emit('go', 'memory-create')">写下一页记忆</button>
    </div>

    <div v-else class="mlistBody">
      <section class="mlistOverview card">
        <div class="mlistOverviewHead">
          <div class="mlistOverviewTitle">这阵子铃湾记住了这些</div>
          <div class="mlistOverviewHint">不是流水账，是会陪你走久一点的那些事。</div>
        </div>
        <div class="mlistOverviewGrid">
          <div class="mlistOverviewCard">
            <div class="mlistOverviewValue">{{ pages.length }}</div>
            <div class="mlistOverviewLabel">长期记忆</div>
          </div>
          <div class="mlistOverviewCard">
            <div class="mlistOverviewValue">{{ personCount }}</div>
            <div class="mlistOverviewLabel">重要的人</div>
          </div>
          <div class="mlistOverviewCard">
            <div class="mlistOverviewValue">{{ preferenceAndTraitCount }}</div>
            <div class="mlistOverviewLabel">偏好与特征</div>
          </div>
        </div>
      </section>

      <div v-if="profileCount > 0" class="mlistCoreBlock card">
        <div class="mlistCoreEyebrow">最核心的一页</div>
        <div class="mlistCoreTitle">关于你</div>
        <div class="mlistCoreHint">这里最适合放“你是谁”。如果铃湾以后有点忘神了，通常也会先翻这里。</div>
      </div>

      <div class="mlistSections">
        <section
          v-for="section in groupedSections"
          :key="section.key"
          class="mlistSection card"
          :class="{ mlistSectionPrimary: section.key === 'identity_profile' && section.pages.length > 0 }"
        >
          <div class="mlistSectionHead">
            <div>
              <div class="mlistSectionTitle">{{ section.icon }} {{ section.title }}</div>
              <div class="mlistSectionHint">{{ section.hint }}</div>
            </div>
            <div class="mlistSectionCount">{{ section.pages.length }} 页</div>
          </div>

          <div v-if="section.pages.length === 0" class="mlistSectionEmpty">
            {{ section.emptyText }}
          </div>

          <div v-else class="mlistSectionList">
            <div
              v-for="page in section.pages"
              :key="page.id"
              class="mlistCard"
              :class="{ mlistCardPrimary: page.pageType === 'identity_profile' }"
              @click="$emit('go', 'memory-detail', page.id)"
            >
              <div class="mlistCardTop">
                <div class="mlistCardType">{{ pageTypeIcon(page.pageType) }} {{ pageTypeLabel(page.pageType) }}</div>
                <div class="mlistCardMeta">{{ formatDate(page.updatedAt) }}</div>
              </div>
              <div class="mlistCardTitle">{{ page.title }}</div>
              <div class="mlistCardSummary">{{ cardSummary(page) }}</div>
            </div>
          </div>
        </section>
      </div>

      <!-- R-05：分页加载更多 -->
      <div v-if="hasMore" class="mlistMore">
        <button class="ghost" type="button" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? '加载中…' : '加载更多' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mlist{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.mlistHead{
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}

.mlistHeadMain{
  flex: 1;
  min-width: 0;
}

.mlistTitle{
  font-size: 18px;
  font-weight: 800;
}

.mlistHint{
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

/* R-05：类型 Tab */
.mlistTabs{
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mlistTab{
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  background: var(--surface);
  border: 1px solid var(--border);
  cursor: pointer;
}
.mlistTab.active{
  border-color: rgba(232,133,106,.4);
  background: rgba(232,133,106,.08);
  color: #C96F52;
  font-weight: 600;
}

.mlistMore{
  display: flex;
  justify-content: center;
  padding: 6px 0 2px;
}

.mlistError{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  font-size: 13px;
}

.mlistLoading{
  text-align: center;
  color: var(--muted);
  padding: 30px;
}

.mlistEmpty{
  text-align: center;
  color: var(--muted);
  padding: 40px;
  border: 1px dashed var(--border);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.mlistEmptyIcon{
  font-size: 28px;
}

.mlistEmptyTitle{
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.mlistEmptyHint{
  font-size: 13px;
  line-height: 1.6;
  max-width: 460px;
}

.mlistEmptyAction{
  margin-top: 6px;
}

.mlistBody{
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 2px;
}

.mlistBody::-webkit-scrollbar{
  width: 4px;
}

.mlistBody::-webkit-scrollbar-thumb{
  background: rgba(0,0,0,.08);
  border-radius: 999px;
}

.mlistOverview{
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mlistOverviewHead{
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mlistOverviewTitle{
  font-size: 16px;
  font-weight: 800;
}

.mlistOverviewHint{
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.mlistOverviewGrid{
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.mlistOverviewCard{
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  padding: 14px;
}

.mlistOverviewValue{
  font-size: 24px;
  font-weight: 800;
}

.mlistOverviewLabel{
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

.mlistCoreBlock{
  padding: 16px 18px;
  background: linear-gradient(135deg, rgba(232,133,106,.14), rgba(255,248,244,.96));
  border-color: rgba(232,133,106,.18);
}

.mlistCoreEyebrow{
  font-size: 11px;
  letter-spacing: .04em;
  color: var(--muted);
}

.mlistCoreTitle{
  margin-top: 4px;
  font-size: 18px;
  font-weight: 800;
}

.mlistCoreHint{
  margin-top: 6px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.mlistSections{
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mlistSection{
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mlistSectionPrimary{
  border-color: rgba(232,133,106,.18);
  background: linear-gradient(180deg, rgba(255,250,246,.96), rgba(255,255,255,.98));
}

.mlistSectionHead{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mlistSectionTitle{
  font-size: 16px;
  font-weight: 700;
}

.mlistSectionHint{
  margin-top: 4px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
  max-width: 620px;
}

.mlistSectionCount{
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.mlistSectionEmpty{
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 14px;
  font-size: 13px;
  color: var(--muted);
  background: rgba(255,255,255,.65);
}

.mlistSectionList{
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mlistCard{
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  background: #fff;
  cursor: pointer;
  transition: border-color .15s ease, transform .15s ease, background .15s ease;
}

.mlistCard:hover{
  border-color: rgba(232,133,106,.24);
  transform: translateY(-1px);
  background: #fffdfa;
}

.mlistCardPrimary{
  border-color: rgba(232,133,106,.22);
  background: linear-gradient(180deg, rgba(255,248,243,.96), #fff);
}

.mlistCardTop{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mlistCardType{
  font-size: 11px;
  color: var(--muted);
}

.mlistCardMeta{
  font-size: 11px;
  color: var(--muted);
}

.mlistCardTitle{
  margin-top: 8px;
  font-weight: 700;
}

.mlistCardSummary{
  margin-top: 6px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

@media (max-width: 760px){
  .mlistHead{
    flex-direction: column;
    align-items: stretch;
  }

  .mlistOverviewGrid{
    grid-template-columns: 1fr;
  }

  .mlistSectionHead{
    flex-direction: column;
  }

  .mlistSectionList{
    grid-template-columns: 1fr;
  }
}
</style>
