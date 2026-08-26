<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  archiveMemoryWikiPage,
  createMemoryWikiPage,
  getMemoryWikiPage,
  getMemoryWikiPageSourceTrace,
  updateMemoryWikiPage,
} from '../api'
import UiButton from './ui/UiButton.vue'
import UiBadge from './ui/UiBadge.vue'
import UiCard from './ui/UiCard.vue'
import UiEmpty from './ui/UiEmpty.vue'

const props = defineProps({
  id: { type: String, default: '' },
})

const emit = defineEmits(['back', 'created', 'deleted', 'open-observation', 'open-memory', 'open-chat-source'])

const PAGE_TYPES = [
  { value: 'identity_profile', label: '关于你', icon: '✨', hint: '名字、关系与近况' },
  { value: 'identity_person', label: '重要的人', icon: '👤', hint: '在意的人与共同经历' },
  { value: 'identity_preference', label: '你的偏好', icon: '👍', hint: '喜欢与不舒服的事' },
  { value: 'identity_trait', label: '你的特征', icon: '🧩', hint: '稳定的性格与习惯' },
]

// 普通记忆页类型（非身份类），与 identity 四类在列表与详情中做分组/标签差异表达
const ORDINARY_PAGE_TYPES = [
  { value: 'event', label: '生活事件', icon: '📖', hint: '想再翻回来的经历' },
  { value: 'topic', label: '主题', icon: '🗂️', hint: '反复出现的话题' },
  { value: 'goal', label: '目标', icon: '🎯', hint: '想推进的目标' },
  { value: 'project', label: '项目', icon: '📁', hint: '进行中的事' },
  { value: 'routine', label: '习惯', icon: '🔁', hint: '稳定的日常节奏' },
  { value: 'need', label: '需要', icon: '💡', hint: '你需要什么' },
]

const ALL_PAGE_TYPES = [...PAGE_TYPES, ...ORDINARY_PAGE_TYPES]
const IDENTITY_PAGE_TYPES = new Set(PAGE_TYPES.map((item) => item.value))

// FE-09：页面类型文案收敛为配置表——新增类型只加配置，不改 if 链。
// T-26-01：仅保留短引导标题与字段文案，机制解释性叙述一律不入前端。
const PAGE_TYPE_COPY = {
  identity_profile: {
    guideTitle: '这里最适合写“你是谁”',
    titleLabel: '名字或主题',
    titlePlaceholder: '比如：叶健钦',
    summaryLabel: '一句话介绍',
    summaryPlaceholder: '一句话摘要',
    contentLabel: '正文',
    contentPlaceholder: '写下想记住的内容',
  },
  identity_person: {
    guideTitle: '把这个人的关键信息写下来',
    titleLabel: '这个人的名字',
    titlePlaceholder: '比如：钟奕菲、大学室友',
    summaryLabel: '一句话记住',
    summaryPlaceholder: '一句话摘要',
    contentLabel: '正文',
    contentPlaceholder: '写下想记住的内容',
  },
  identity_preference: {
    guideTitle: '把舒服和不舒服都写下来',
    titleLabel: '偏好名称',
    titlePlaceholder: '比如：喜欢被温柔回应',
    summaryLabel: '一句话记住',
    summaryPlaceholder: '一句话摘要',
    contentLabel: '正文',
    contentPlaceholder: '写下想记住的内容',
  },
  identity_trait: {
    guideTitle: '把稳定的样子留下来',
    titleLabel: '特征名称',
    titlePlaceholder: '比如：容易心软',
    summaryLabel: '一句话记住',
    summaryPlaceholder: '一句话摘要',
    contentLabel: '正文',
    contentPlaceholder: '写下想记住的内容',
  },
}

const DEFAULT_PAGE_COPY = {
  guideTitle: '把这件想记住的事写下来',
  titleLabel: '标题',
  titlePlaceholder: '比如：一次旅行',
  summaryLabel: '摘要',
  summaryPlaceholder: '一句话摘要',
  contentLabel: '正文',
  contentPlaceholder: '写下想记住的内容',
}

function createEmptyPage() {
  return {
    pageType: 'identity_profile',
    title: '',
    summary: '',
    content: '',
  }
}

const page = ref(null)
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const loadFailed = ref(false)
const confirmDelete = ref(false)
const errorMsg = ref('')
const dirty = ref(false)
const sourceTrace = ref(null)

const isCreateMode = computed(() => !props.id)
const isIdentityType = computed(() => Boolean(page.value && IDENTITY_PAGE_TYPES.has(page.value.pageType)))
const pageTypeMeta = computed(() => ALL_PAGE_TYPES.find((item) => item.value === page.value?.pageType) || null)
const pageTypeIcon = computed(() => pageTypeMeta.value?.icon || '📌')
const pageTypeLabel = computed(() => pageTypeMeta.value?.label || '长期记忆')
const pageCopy = computed(() => PAGE_TYPE_COPY[page.value?.pageType] || DEFAULT_PAGE_COPY)
const submitLabel = computed(() => {
  if (saving.value) return isCreateMode.value ? '创建中…' : '保存中…'
  return isCreateMode.value ? '创建这页记忆' : '保存修改'
})
const relatedPages = computed(() =>
  Array.isArray(sourceTrace.value?.relatedPages) ? sourceTrace.value.relatedPages : []
)
const chatSources = computed(() => (Array.isArray(sourceTrace.value?.chatSources) ? sourceTrace.value.chatSources : []))
const observationSources = computed(() =>
  Array.isArray(sourceTrace.value?.observationSources) ? sourceTrace.value.observationSources : []
)
const hasSourceSummary = computed(
  () => relatedPages.value.length > 0 || chatSources.value.length > 0 || observationSources.value.length > 0
)

async function loadPage() {
  if (isCreateMode.value) {
    page.value = createEmptyPage()
    errorMsg.value = ''
    loadFailed.value = false
    confirmDelete.value = false
    dirty.value = false
    sourceTrace.value = null
    mode.value = 'edit' // R-06：新建直接进入编辑态
    return
  }

  loading.value = true
  errorMsg.value = ''
  loadFailed.value = false
  confirmDelete.value = false
  try {
    const data = await getMemoryWikiPage(props.id)
    const loaded = data.page || data
    page.value = {
      pageType: loaded?.pageType || 'identity_profile',
      title: loaded?.title || '',
      summary: loaded?.summary || '',
      content: loaded?.content || loaded?.body || '',
    }
    const traceData = await getMemoryWikiPageSourceTrace(props.id)
    sourceTrace.value = traceData?.trace || null
    dirty.value = false
    mode.value = 'read' // R-06：查看已有记忆默认阅读态
  } catch {
    // 加载失败：绝不拿空表单覆盖真实页面，只展示纯错误态
    page.value = null
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

// R-06：阅读 / 编辑两态
const mode = ref('read') // 'read' | 'edit'

function enterEdit() {
  if (isCreateMode.value || loadFailed.value) return
  mode.value = 'edit'
}

function cancelEdit() {
  if (isCreateMode.value) return
  mode.value = 'read'
  loadPage()
}

function markDirty() {
  dirty.value = true
}

function shortPreview(text, maxLen = 56) {
  const normalized = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return '暂无内容'
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen)}…` : normalized
}

async function save() {
  if (!page.value.title.trim()) {
    errorMsg.value = '先填写标题'
    return
  }

  saving.value = true
  errorMsg.value = ''
  try {
    const payload = {
      pageType: page.value.pageType,
      title: page.value.title.trim(),
      summary: page.value.summary.trim(),
      content: page.value.content.trim(),
    }

    if (isCreateMode.value) {
      const result = await createMemoryWikiPage(payload)
      const created = result?.page || result
      dirty.value = false
      emit('created', created?.pageId || created?.id || '')
      return
    }

    await updateMemoryWikiPage(props.id, payload)
    dirty.value = false
    // R-06：保存成功回到阅读态（重新加载最新数据）
    mode.value = 'read'
    await loadPage()
  } catch {
    errorMsg.value = '保存失败，请稍后再试'
  } finally {
    saving.value = false
  }
}

async function archivePage() {
  if (!props.id || !confirmDelete.value) return

  deleting.value = true
  errorMsg.value = ''
  try {
    await archiveMemoryWikiPage(props.id)
    emit('deleted')
  } catch {
    errorMsg.value = '删除失败，请稍后再试'
  } finally {
    deleting.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <div class="mdetail">
    <header class="mdetailHead">
      <UiButton variant="ghost" @click="$emit('back')">← 返回列表</UiButton>
      <div class="mdetailActions">
        <UiButton
          v-if="!isCreateMode && !loadFailed"
          variant="dangerGhost"
          :disabled="saving || deleting"
          @click="confirmDelete = true"
        >
          {{ deleting ? '整理中…' : '删除这页' }}
        </UiButton>
        <!-- R-06：阅读态显示"编辑"，编辑态显示"取消/保存" -->
        <template v-if="mode === 'edit'">
          <UiButton v-if="!isCreateMode" variant="ghost" :disabled="saving" @click="cancelEdit">取消</UiButton>
          <UiButton variant="default" :disabled="saving || loadFailed || (!dirty && !isCreateMode)" @click="save">
            {{ submitLabel }}
          </UiButton>
        </template>
        <UiButton v-else variant="default" :disabled="loadFailed" @click="enterEdit">编辑</UiButton>
      </div>
    </header>

    <div v-if="loading" class="mdetailLoading">加载中…</div>
    <UiEmpty v-else-if="loadFailed" icon="⚠️" text="加载失败，请稍后再试">
      <template #action>
        <div class="mdetailLoadErrorActions">
          <UiButton variant="ghost" @click="$emit('back')">返回</UiButton>
          <UiButton variant="default" @click="loadPage">再试一次</UiButton>
        </div>
      </template>
    </UiEmpty>
    <UiCard v-else-if="page" class="mdetailCard">
      <div class="mdetailIntro">
        <div class="mdetailMode">
          {{ isCreateMode ? '新建长期记忆' : mode === 'edit' ? '编辑长期记忆' : '长期记忆' }}
        </div>
        <UiBadge class="mdetailTypePill" :class="{ mdetailTypePillOrdinary: !isIdentityType }">
          {{ pageTypeIcon }} {{ pageTypeLabel }}
        </UiBadge>
      </div>

      <section v-if="confirmDelete && !isCreateMode" class="mdetailConfirm">
        <div class="mdetailConfirmTitle">要把这页记忆收起来吗？</div>
        <div class="mdetailConfirmActions">
          <UiButton variant="ghost" :disabled="deleting" @click="confirmDelete = false">再想想</UiButton>
          <UiButton variant="destructive" :disabled="deleting" @click="archivePage">
            {{ deleting ? '整理中…' : '确认删除' }}
          </UiButton>
        </div>
      </section>

      <!-- R-06：编辑态（引导 + 表单） -->
      <template v-if="mode === 'edit'">
        <div class="mdetailGuideTitle">{{ pageCopy.guideTitle }}</div>

        <label class="mdetailField">
          <span>记忆类型</span>
          <select v-model="page.pageType" @change="markDirty">
            <optgroup label="关于你的记忆">
              <option v-for="item in PAGE_TYPES" :key="item.value" :value="item.value">{{ item.label }}</option>
            </optgroup>
            <optgroup label="其他想记住的">
              <option v-for="item in ORDINARY_PAGE_TYPES" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </optgroup>
          </select>
        </label>

        <label class="mdetailField">
          <span>{{ pageCopy.titleLabel }}</span>
          <input
            v-model="page.title"
            class="mdetailTitle"
            :placeholder="pageCopy.titlePlaceholder"
            @input="markDirty"
          />
        </label>

        <label class="mdetailField">
          <span>{{ pageCopy.summaryLabel }}</span>
          <textarea
            v-model="page.summary"
            class="mdetailSummary"
            rows="3"
            :placeholder="pageCopy.summaryPlaceholder"
            @input="markDirty"
          />
        </label>

        <label class="mdetailField mdetailFieldGrow">
          <span>{{ pageCopy.contentLabel }}</span>
          <textarea
            v-model="page.content"
            class="mdetailContent"
            :placeholder="pageCopy.contentPlaceholder"
            @input="markDirty"
          />
        </label>

        <div v-if="errorMsg" class="mdetailError">{{ errorMsg }}</div>
      </template>

      <!-- R-06：阅读态（干净排版） -->
      <div v-else class="mdetailRead">
        <div class="mdetailReadTitle">{{ page.title || '未命名记忆' }}</div>
        <div v-if="page.summary" class="mdetailReadSummary">{{ page.summary }}</div>
        <div v-if="page.content" class="mdetailReadContent">{{ page.content }}</div>
      </div>

      <!-- 来源（编辑/阅读两态共用） -->
      <section v-if="!isCreateMode && page" class="mdetailSource">
        <div class="sectionTitle">这页记忆是怎么来的</div>
        <div v-if="hasSourceSummary" class="sourceSummaryGrid">
          <div class="sourceSummaryItem">
            <div class="sourceSummaryValue">{{ chatSources.length }}</div>
            <div class="sourceSummaryLabel">聊天来源</div>
          </div>
          <div class="sourceSummaryItem">
            <div class="sourceSummaryValue">{{ observationSources.length }}</div>
            <div class="sourceSummaryLabel">观察记录</div>
          </div>
          <div class="sourceSummaryItem">
            <div class="sourceSummaryValue">{{ relatedPages.length }}</div>
            <div class="sourceSummaryLabel">相关记忆</div>
          </div>
        </div>
        <div v-else class="mdetailMuted">暂无来源记录</div>

        <div v-if="chatSources.length > 0" class="sourceBlock">
          <div class="sourceBlockTitle">来自聊天记录</div>
          <div class="sourceList">
            <div
              v-for="item in chatSources.slice(0, 3)"
              :key="`${item.date}-${item.messageId}`"
              class="sourceItem"
              :class="{ sourceItemLink: item.date }"
              @click="item.date && emit('open-chat-source', { date: item.date, messageId: item.messageId || '' })"
            >
              <div class="sourceItemTitle">{{ item.date || '聊天记录' }}</div>
              <div class="sourceItemBody">
                <span>{{ shortPreview(item.preview || item.title) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="observationSources.length > 0" class="sourceBlock">
          <div class="sourceBlockTitle">来自观察记录</div>
          <div class="sourceList">
            <div
              v-for="item in observationSources.slice(0, 3)"
              :key="item.observationId || item.title"
              class="sourceItem"
              :class="{ sourceItemLink: item.observationId }"
              @click="item.observationId && emit('open-observation', item.observationId)"
            >
              <div class="sourceItemTitle">{{ item.title || '观察记录' }}</div>
            </div>
          </div>
        </div>
        <div v-if="relatedPages.length > 0" class="sourceBlock">
          <div class="sourceBlockTitle">相关记忆</div>
          <div class="relatedPageList">
            <div
              v-for="item in relatedPages"
              :key="item.pageId || item.id"
              class="relatedPageItem"
              :class="{ sourceItemLink: item.pageId || item.id }"
              @click="(item.pageId || item.id) && emit('open-memory', item.pageId || item.id)"
            >
              <div class="relatedPageTitle">{{ item.title || '未命名记忆' }}</div>
            </div>
          </div>
        </div>
      </section>
    </UiCard>
  </div>
</template>

<style scoped>
.mdetail {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.mdetailHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.mdetailActions {
  display: flex;
  gap: 8px;
}

.mdetailLoading {
  text-align: center;
  color: var(--muted);
  padding: 40px;
}

.mdetailError {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-danger) 8%, transparent);
  color: var(--danger);
  font-size: var(--text-base);
}

.mdetailLoadErrorActions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.mdetailCard {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mdetailIntro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* R-06：阅读态 */
.mdetailRead {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mdetailReadTitle {
  font-size: var(--text-2xl);
  font-weight: 800;
  line-height: 1.4;
}
.mdetailReadSummary {
  font-size: var(--text-md);
  color: var(--muted);
  line-height: 1.6;
}
.mdetailReadContent {
  font-size: var(--text-md);
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.mdetailMode {
  font-size: var(--text-xl);
  font-weight: 800;
}

.mdetailGuideTitle {
  font-size: var(--text-lg);
  font-weight: 800;
}

.mdetailConfirm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.mdetailConfirmTitle {
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--danger);
}

.mdetailConfirmActions {
  display: flex;
  gap: 8px;
}

.sectionTitle {
  font-size: var(--text-md);
  font-weight: 700;
  margin-bottom: 10px;
}

.sourceSummaryGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.sourceSummaryValue {
  font-size: var(--text-2xl);
  font-weight: 800;
}

.sourceSummaryLabel {
  margin-top: 4px;
  font-size: var(--text-sm);
  color: var(--muted);
}

.sourceBlock {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sourceBlockTitle {
  font-size: var(--text-base);
  font-weight: 600;
}

.sourceList,
.relatedPageList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sourceItemLink {
  cursor: pointer;
}

.sourceItemLink:hover {
  background: var(--surface-2);
}

.sourceItemTitle,
.relatedPageTitle {
  font-size: var(--text-base);
  font-weight: 600;
}

.sourceItemBody,
.relatedPageMeta,
.mdetailMuted {
  margin-top: 4px;
  font-size: var(--text-sm);
  color: var(--muted);
  line-height: 1.6;
}

.sourceItemBody {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mdetailField {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mdetailField > span {
  font-size: var(--text-sm);
  color: var(--muted);
}

.mdetailFieldGrow {
  flex: 1;
  min-height: 240px;
}

.mdetailTitle {
  font-size: var(--text-lg);
  font-weight: 600;
}

.mdetailSummary {
  resize: vertical;
  line-height: 1.6;
}

.mdetailContent {
  min-height: 240px;
  height: 100%;
  resize: vertical;
  line-height: 1.7;
}

@media (max-width: 760px) {
  .mdetailHead {
    flex-direction: column;
    align-items: stretch;
  }

  .mdetailActions {
    flex-direction: column;
  }

  .sourceSummaryGrid {
    grid-template-columns: 1fr;
  }
}
</style>
