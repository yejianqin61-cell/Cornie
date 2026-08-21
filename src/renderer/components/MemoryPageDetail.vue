<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  archiveMemoryWikiPage,
  createMemoryWikiPage,
  getMemoryWikiPage,
  getMemoryWikiPageSourceTrace,
  updateMemoryWikiPage
} from '../api'

const props = defineProps({
  id: { type: String, default: '' }
})

const emit = defineEmits(['back', 'created', 'deleted', 'open-observation', 'open-memory', 'open-chat-source'])

const PAGE_TYPES = [
  {
    value: 'identity_profile',
    label: '关于你',
    icon: '✨',
    hint: '记下你的名字、身份、你和铃湾的关系，或者你最近的人生状态。'
  },
  {
    value: 'identity_person',
    label: '重要的人',
    icon: '👤',
    hint: '记下你在意的人、你们的关系，还有你想保留的共同经历。'
  },
  {
    value: 'identity_preference',
    label: '你的偏好',
    icon: '👍',
    hint: '记下你喜欢什么、不喜欢什么，或者你更习惯怎样被照顾。'
  },
  {
    value: 'identity_trait',
    label: '你的特征',
    icon: '🧩',
    hint: '记下比较稳定的性格、表达方式，或你面对压力时的样子。'
  }
]

// 普通记忆页类型（非身份类），与 identity 四类在列表与详情中做分组/标签差异表达
const ORDINARY_PAGE_TYPES = [
  {
    value: 'event',
    label: '生活事件',
    icon: '📖',
    hint: '记下一件发生过、以后想再翻回来的经历。'
  },
  {
    value: 'topic',
    label: '主题',
    icon: '🗂️',
    hint: '把一个反复出现的话题收成一页，方便以后慢慢看。'
  },
  {
    value: 'goal',
    label: '目标',
    icon: '🎯',
    hint: '记下你想推进的目标，或这段时间最想做成的事。'
  },
  {
    value: 'project',
    label: '项目',
    icon: '📁',
    hint: '为一件正在进行的事或一段计划单独留一页。'
  },
  {
    value: 'routine',
    label: '习惯',
    icon: '🔁',
    hint: '记下你稳定的习惯和日常节奏，铃湾会慢慢学着照顾它。'
  },
  {
    value: 'need',
    label: '需要',
    icon: '💡',
    hint: '记下你需要什么、在意什么，方便铃湾更好地照顾你。'
  }
]

const ALL_PAGE_TYPES = [...PAGE_TYPES, ...ORDINARY_PAGE_TYPES]
const IDENTITY_PAGE_TYPES = new Set(PAGE_TYPES.map((item) => item.value))

// FE-09：页面类型文案/引导/提示字段收敛为配置表——新增类型只加配置，不改 if 链。
const PAGE_TYPE_COPY = {
  identity_profile: {
    guide: {
      eyebrow: '最核心的一页',
      title: '这里最适合写“你是谁”',
      body: '名字、你和铃湾的关系、你最近的人生状态，或者你最希望被怎样记住，都可以慢慢放在这里。'
    },
    titleLabel: '这页想记住的名字或主题',
    titlePlaceholder: '比如：叶健钦、现在的我、铃湾记住的我',
    summaryLabel: '一句话介绍你自己',
    summaryPlaceholder: '先用一两句话写下“你是谁”和“铃湾最该记住什么”。',
    contentLabel: '更完整地写下你自己',
    contentPlaceholder: '可以写你的名字、身份、你和铃湾的关系、最近的状态，或者你最希望以后被怎样理解。',
    prompts: [
      '你叫什么？如果铃湾平时有更亲近的叫法，也可以一起写下来。',
      '你和铃湾是什么关系？你希望她怎样理解你们之间的连接？',
      '你最近正在经历什么阶段？生活、学业、工作、情绪都可以简单提一下。',
      '你现在最在意什么？最近最想守住、推进，或最想被理解的是什么？'
    ]
  },
  identity_person: {
    guide: {
      eyebrow: '重要的人',
      title: '把这个人留得更清楚一点',
      body: '可以写他是谁、你们是什么关系、哪些共同经历最值得被留下来。'
    },
    titleLabel: '这个人的名字',
    titlePlaceholder: '比如：钟奕菲、大学室友、妈妈',
    summaryLabel: '一句话记住这个人',
    summaryPlaceholder: '先用一两句话写下这个人对你来说最重要的意义。',
    contentLabel: '更完整地写下这个人',
    contentPlaceholder: '可以写他是谁、你们怎么认识、关系怎样变化、有哪些重要经历，或者你为什么不想忘记这个人。',
    prompts: [
      '你们是什么关系？这个人最常以什么身份出现在你的生活里？',
      '你对他的第一印象或最深印象是什么？',
      '你们之间有什么共同经历，是你很想留下来的？',
      '这个人为什么重要？这段关系对你意味着什么？'
    ]
  },
  identity_preference: {
    guide: {
      eyebrow: '你的偏好',
      title: '把舒服和不舒服都说清楚',
      body: '喜欢什么、不喜欢什么、怎样的陪伴方式会更让你安心，这里都可以记下来。'
    },
    titleLabel: '这个偏好的名字',
    titlePlaceholder: '比如：喜欢被温柔回应、讨厌临时变动',
    summaryLabel: '一句话记住这个偏好',
    summaryPlaceholder: '先用一两句话写下这个偏好为什么重要。',
    contentLabel: '更完整地写下这个偏好',
    contentPlaceholder: '可以写这个偏好出现在哪些情景、什么会让你更舒服、什么会让你不舒服。',
    prompts: []
  },
  identity_trait: {
    guide: {
      eyebrow: '你的特征',
      title: '把稳定的小习惯和性格样子留下来',
      body: '比如你的表达方式、习惯、压力大的时候会有什么反应，这些都能帮铃湾更懂你。'
    },
    titleLabel: '这个特征的名字',
    titlePlaceholder: '比如：容易心软、睡前爱刷手机、压力大时会沉默',
    summaryLabel: '一句话记住这个特征',
    summaryPlaceholder: '先用一两句话写下这个特征最常出现的样子。',
    contentLabel: '更完整地写下这个特征',
    contentPlaceholder: '可以写这个特征常出现在哪些时候、它怎样影响你的表达、情绪或选择。',
    prompts: []
  }
}

const DEFAULT_PAGE_COPY = {
  guide: {
    eyebrow: '一页想留住的记忆',
    title: '把这件想记住的事写下来',
    body: '可以写下发生了什么、为什么想留住它，也可以留一点以后翻到这里时能想起来的线索。'
  },
  titleLabel: '这页记忆的名字',
  titlePlaceholder: '比如：一次旅行、最近在追的剧、想学的新东西',
  summaryLabel: '一句话记住这件事',
  summaryPlaceholder: '先用一两句话写下这件事最值得记住的地方。',
  contentLabel: '更完整地写下这件事',
  contentPlaceholder: '可以写这件事发生在什么时候、当时是怎样的，以及你为什么想把它留在这里。',
  prompts: []
}

function createEmptyPage() {
  return {
    pageType: 'identity_profile',
    title: '',
    summary: '',
    content: ''
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
const pageTypeMeta = computed(() =>
  ALL_PAGE_TYPES.find((item) => item.value === page.value?.pageType) || null
)
const pageTypeIcon = computed(() => pageTypeMeta.value?.icon || '📌')
const pageTypeHint = computed(() =>
  pageTypeMeta.value?.hint || '把这页记忆写成以后想再翻回来的样子。'
)
const pageTypeLabel = computed(() =>
  pageTypeMeta.value?.label || '长期记忆'
)
const pageCopy = computed(() => PAGE_TYPE_COPY[page.value?.pageType] || DEFAULT_PAGE_COPY)
const pageGuide = computed(() => pageCopy.value.guide)
const titleLabel = computed(() => pageCopy.value.titleLabel)
const titlePlaceholder = computed(() => pageCopy.value.titlePlaceholder)
const summaryLabel = computed(() => pageCopy.value.summaryLabel)
const summaryPlaceholder = computed(() => pageCopy.value.summaryPlaceholder)
const contentLabel = computed(() => pageCopy.value.contentLabel)
const contentPlaceholder = computed(() => pageCopy.value.contentPlaceholder)
const pagePrompts = computed(() => pageCopy.value.prompts || [])
const submitLabel = computed(() => {
  if (saving.value) return isCreateMode.value ? '创建中…' : '保存中…'
  return isCreateMode.value ? '创建这页记忆' : '保存修改'
})
const relatedPages = computed(() => Array.isArray(sourceTrace.value?.relatedPages) ? sourceTrace.value.relatedPages : [])
const chatSources = computed(() => Array.isArray(sourceTrace.value?.chatSources) ? sourceTrace.value.chatSources : [])
const observationSources = computed(() => Array.isArray(sourceTrace.value?.observationSources) ? sourceTrace.value.observationSources : [])
const hasSourceSummary = computed(() =>
  relatedPages.value.length > 0 || chatSources.value.length > 0 || observationSources.value.length > 0
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
      content: loaded?.content || loaded?.body || ''
    }
    const traceData = await getMemoryWikiPageSourceTrace(props.id)
    sourceTrace.value = traceData?.trace || null
    dirty.value = false
    mode.value = 'read' // R-06：查看已有记忆默认阅读态
  } catch (e) {
    // 加载失败：绝不拿空表单覆盖真实页面，只展示纯错误态
    page.value = null
    loadFailed.value = true
    errorMsg.value = '这页记忆暂时没打开成功，稍后再试一次吧。'
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

function summarizePageType(pageType) {
  return ALL_PAGE_TYPES.find((item) => item.value === pageType)?.label || '长期记忆'
}

function shortPreview(text, maxLen = 56) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return '铃湾当时没有留下更多文字。'
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen)}…` : normalized
}

async function save() {
  if (!page.value.title.trim()) {
    errorMsg.value = '先给这页记忆起个名字吧。'
    return
  }

  saving.value = true
  errorMsg.value = ''
  try {
    const payload = {
      pageType: page.value.pageType,
      title: page.value.title.trim(),
      summary: page.value.summary.trim(),
      content: page.value.content.trim()
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
  } catch (e) {
    errorMsg.value = isCreateMode.value
      ? '这页记忆还没能存好，我们换个标题或者稍后再试一次吧。'
      : '这次修改还没保存成功，不过内容还在，我们再试一次就好。'
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
  } catch (e) {
    errorMsg.value = '这页记忆这次还没收起来，我们稍后再试一次吧。'
  } finally {
    deleting.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <div class="mdetail">
    <header class="mdetailHead">
      <button class="ghost" @click="$emit('back')">← 返回记忆列表</button>
      <div class="mdetailActions">
        <button
          v-if="!isCreateMode && !loadFailed"
          class="ghost dangerGhost"
          :disabled="saving || deleting"
          @click="confirmDelete = true"
        >
          {{ deleting ? '整理中…' : '删除这页' }}
        </button>
        <!-- R-06：阅读态显示"编辑"，编辑态显示"取消/保存" -->
        <template v-if="mode === 'edit'">
          <button v-if="!isCreateMode" class="ghost" :disabled="saving" @click="cancelEdit">取消</button>
          <button class="primary" :disabled="saving || loadFailed || (!dirty && !isCreateMode)" @click="save">
            {{ submitLabel }}
          </button>
        </template>
        <button v-else class="primary" :disabled="loadFailed" @click="enterEdit">编辑</button>
      </div>
    </header>

    <div v-if="loading" class="mdetailLoading">加载中…</div>
    <div v-else-if="loadFailed" class="mdetailLoadError">
      <div class="mdetailLoadErrorTitle">这页记忆暂时没打开成功</div>
      <div class="mdetailLoadErrorHint">可能是它刚被整理过，稍后再试一次就好。</div>
      <div class="mdetailLoadErrorActions">
        <button class="ghost" @click="$emit('back')">← 返回记忆列表</button>
        <button class="primary" @click="loadPage">再试一次</button>
      </div>
    </div>
    <div v-else-if="page" class="mdetailCard card">
      <div class="mdetailIntro">
        <div class="mdetailMode">{{ isCreateMode ? '新建长期记忆' : (mode === 'edit' ? '编辑长期记忆' : '长期记忆') }}</div>
        <div class="mdetailHint">{{ pageTypeHint }}</div>
        <div class="mdetailTypePill" :class="{ mdetailTypePillOrdinary: !isIdentityType }">
          {{ pageTypeIcon }} {{ pageTypeLabel }}
        </div>
      </div>

      <section
        v-if="confirmDelete && !isCreateMode"
        class="mdetailConfirm cardShell"
      >
        <div class="mdetailConfirmTitle">要把这页记忆收起来吗？</div>
        <div class="mdetailConfirmHint">收起后它会先从普通列表里消失，你写下的内容本身不会被改动。</div>
        <div class="mdetailConfirmActions">
          <button class="ghost" :disabled="deleting" @click="confirmDelete = false">再想想</button>
          <button class="danger" :disabled="deleting" @click="archivePage">
            {{ deleting ? '整理中…' : '确认删除' }}
          </button>
        </div>
      </section>

      <!-- R-06：编辑态（引导 + 来源 + 表单） -->
      <template v-if="mode === 'edit'">
        <section class="mdetailGuide" :class="{ mdetailGuidePrimary: page.pageType === 'identity_profile', mdetailGuideOrdinary: !isIdentityType }">
        <div class="mdetailGuideEyebrow">{{ pageGuide.eyebrow }}</div>
        <div class="mdetailGuideTitle">{{ pageGuide.title }}</div>
        <div class="mdetailGuideBody">{{ pageGuide.body }}</div>
      </section>

      <section v-if="page.pageType === 'identity_profile'" class="mdetailGuide mdetailGuideProfile">
        <div class="mdetailGuideEyebrow">写“关于你”的时候，可以先留下这些</div>
        <div class="mdetailPromptList">
          <div v-for="item in pagePrompts" :key="item" class="mdetailPromptItem">{{ item }}</div>
        </div>
      </section>

      <section v-if="page.pageType === 'identity_person'" class="mdetailGuide mdetailGuidePerson">
        <div class="mdetailGuideEyebrow">写这个人的时候，可以顺着想</div>
        <div class="mdetailPromptList">
          <div v-for="item in pagePrompts" :key="item" class="mdetailPromptItem">{{ item }}</div>
        </div>
      </section>

      <section v-if="!isCreateMode" class="mdetailSource cardShell">
        <div class="sectionTitle">这页记忆是怎么来的</div>
        <div v-if="hasSourceSummary" class="sourceSummaryGrid">
          <div class="sourceSummaryCard">
            <div class="sourceSummaryValue">{{ chatSources.length }}</div>
            <div class="sourceSummaryLabel">聊天来源</div>
          </div>
          <div class="sourceSummaryCard">
            <div class="sourceSummaryValue">{{ observationSources.length }}</div>
            <div class="sourceSummaryLabel">观察记录</div>
          </div>
          <div class="sourceSummaryCard">
            <div class="sourceSummaryValue">{{ relatedPages.length }}</div>
            <div class="sourceSummaryLabel">相关记忆</div>
          </div>
        </div>
        <div v-else class="mdetailMuted">这页记忆目前更像是你主动写下来的，铃湾还没有翻出更多来源线索。</div>

        <div v-if="chatSources.length > 0" class="sourceBlock">
          <div class="sourceBlockTitle">铃湾是从这些聊天里慢慢记住它的</div>
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
                <span v-if="item.date" class="sourceItemHint">点开看看当时怎么说的</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="observationSources.length > 0" class="sourceBlock">
          <div class="sourceBlockTitle">这些观察记录也在帮铃湾确认它</div>
          <div class="sourceList">
            <div
              v-for="item in observationSources.slice(0, 3)"
              :key="item.observationId || item.title"
              class="sourceItem"
              :class="{ sourceItemLink: item.observationId }"
              @click="item.observationId && emit('open-observation', item.observationId)"
            >
              <div class="sourceItemTitle">{{ item.title || '观察记录' }}</div>
              <div class="sourceItemBody">
                <span>{{ item.date || '没有日期信息' }}</span>
                <span v-if="item.observationId" class="sourceItemHint">点开看看当时记下了什么</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="relatedPages.length > 0" class="sourceBlock">
          <div class="sourceBlockTitle">和它有关的记忆</div>
          <div class="relatedPageList">
            <div
              v-for="item in relatedPages"
              :key="item.pageId || item.id"
              class="relatedPageItem"
              :class="{ sourceItemLink: item.pageId || item.id }"
              @click="(item.pageId || item.id) && emit('open-memory', item.pageId || item.id)"
            >
              <div class="relatedPageTitle">{{ item.title || '未命名记忆' }}</div>
              <div class="relatedPageMeta">
                <span>{{ summarizePageType(item.pageType) }}</span>
                <span v-if="item.pageId || item.id" class="sourceItemHint">点开继续看看这段记忆</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <label class="mdetailField">
        <span>记忆类型</span>
        <select v-model="page.pageType" @change="markDirty">
          <optgroup label="关于你的记忆">
            <option v-for="item in PAGE_TYPES" :key="item.value" :value="item.value">{{ item.label }}</option>
          </optgroup>
          <optgroup label="其他想记住的">
            <option v-for="item in ORDINARY_PAGE_TYPES" :key="item.value" :value="item.value">{{ item.label }}</option>
          </optgroup>
        </select>
      </label>

      <label class="mdetailField">
        <span>{{ titleLabel }}</span>
        <input
          v-model="page.title"
          class="mdetailTitle"
          :placeholder="titlePlaceholder"
          @input="markDirty"
        />
      </label>

      <label class="mdetailField">
        <span>{{ summaryLabel }}</span>
        <textarea
          v-model="page.summary"
          class="mdetailSummary"
          rows="3"
          :placeholder="summaryPlaceholder"
          @input="markDirty"
        />
      </label>

      <label class="mdetailField mdetailFieldGrow">
        <span>{{ contentLabel }}</span>
        <textarea
          v-model="page.content"
          class="mdetailContent"
          :placeholder="contentPlaceholder"
          @input="markDirty"
        />
      </label>

      <div v-if="errorMsg" class="mdetailError">{{ errorMsg }}</div>
      </template>

      <!-- R-06：阅读态（干净排版 + 来源/相关页弱化展示） -->
      <div v-else class="mdetailRead">
        <div class="mdetailReadTitle">{{ page.title || '未命名记忆' }}</div>
        <div v-if="page.summary" class="mdetailReadSummary">{{ page.summary }}</div>
        <div v-if="page.content" class="mdetailReadContent">{{ page.content }}</div>

        <section v-if="!isCreateMode" class="mdetailSource cardShell">
          <div class="sectionTitle">这页记忆是怎么来的</div>
          <div v-if="chatSources.length > 0" class="sourceBlock">
            <div class="sourceBlockTitle">铃湾是从这些聊天里慢慢记住它的</div>
            <div class="sourceList">
              <div
                v-for="item in chatSources.slice(0, 3)"
                :key="`${item.date}-${item.messageId}`"
                class="sourceItem"
                :class="{ sourceItemLink: item.date }"
                @click="item.date && emit('open-chat-source', { date: item.date, messageId: item.messageId || '' })"
              >
                <div class="sourceItemTitle">{{ item.date || '聊天记录' }}</div>
                <div class="sourceItemBody"><span>{{ shortPreview(item.preview || item.title) }}</span></div>
              </div>
            </div>
          </div>
          <div v-if="observationSources.length > 0" class="sourceBlock">
            <div class="sourceBlockTitle">这些观察记录也在帮铃湾确认它</div>
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
            <div class="sourceBlockTitle">和它有关的记忆</div>
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.mdetail{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.mdetailHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}

.mdetailActions{
  display: flex;
  gap: 8px;
}

.mdetailLoading{ text-align: center; color: var(--muted); padding: 40px; }

.mdetailError{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  font-size: 13px;
}

.mdetailLoadError{
  flex: 1;
  border: 1px dashed rgba(217,106,92,.35);
  border-radius: 16px;
  background: rgba(217,106,92,.05);
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}

.mdetailLoadErrorTitle{
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
}

.mdetailLoadErrorHint{
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.mdetailLoadErrorActions{
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.mdetailCard{
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mdetailIntro{
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* R-06：阅读态 */
.mdetailRead{
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mdetailReadTitle{
  font-size: 20px;
  font-weight: 800;
  line-height: 1.4;
}
.mdetailReadSummary{
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
}
.mdetailReadContent{
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  color: #3A3A3A;
}

.mdetailMode{
  font-size: 18px;
  font-weight: 800;
}

.mdetailTypePill{
  align-self: flex-start;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(232, 133, 106, 0.12);
  color: var(--text);
  font-size: 12px;
}

.mdetailTypePillOrdinary{
  background: rgba(0,0,0,.05);
  color: var(--muted);
}

.mdetailHint{
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.mdetailGuide{
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(255,252,249,.95), #fff);
}

.mdetailGuidePrimary{
  border-color: rgba(232,133,106,.18);
  background: linear-gradient(135deg, rgba(232,133,106,.14), rgba(255,248,244,.96));
}

.mdetailGuidePerson{
  background: linear-gradient(180deg, rgba(255,250,246,.92), #fff);
}

.mdetailGuideProfile{
  background: linear-gradient(180deg, rgba(255,248,242,.94), #fff);
}

.mdetailGuideOrdinary{
  background: linear-gradient(180deg, rgba(244,247,250,.94), #fff);
  border-color: rgba(120,140,160,.16);
}

.mdetailGuideEyebrow{
  font-size: 11px;
  letter-spacing: .04em;
  color: var(--muted);
}

.mdetailGuideTitle{
  margin-top: 4px;
  font-size: 16px;
  font-weight: 800;
}

.mdetailGuideBody{
  margin-top: 6px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.mdetailPromptList{
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.mdetailPromptItem{
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.mdetailConfirm{
  border-color: rgba(217,106,92,.28);
  background: #fffdfb;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mdetailConfirmTitle{
  font-size: 14px;
  font-weight: 700;
}

.mdetailConfirmHint{
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.mdetailConfirmActions{
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.cardShell{
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  background: #fffdfc;
}

.sectionTitle{
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 10px;
}

.sourceSummaryGrid{
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.sourceSummaryCard{
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  background: #fff;
}

.sourceSummaryValue{
  font-size: 20px;
  font-weight: 800;
}

.sourceSummaryLabel{
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.sourceBlock{
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sourceBlockTitle{
  font-size: 13px;
  font-weight: 600;
}

.sourceList,
.relatedPageList{
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sourceItem,
.relatedPageItem{
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  background: #fff;
}

.sourceItemLink{
  cursor: pointer;
  transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
}

.sourceItemLink:hover{
  transform: translateY(-1px);
  border-color: rgba(232,133,106,.34);
  box-shadow: 0 10px 22px rgba(203, 127, 90, .12);
}

.sourceItemTitle,
.relatedPageTitle{
  font-size: 13px;
  font-weight: 600;
}

.sourceItemBody,
.relatedPageMeta,
.mdetailMuted{
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

.sourceItemBody{
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sourceItemHint{
  color: var(--accent-strong);
}

.mdetailField{
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mdetailField > span{
  font-size: 12px;
  color: var(--muted);
}

.mdetailFieldGrow{
  flex: 1;
  min-height: 240px;
}

.mdetailTitle,
.mdetailSummary,
.mdetailContent,
.mdetailField select{
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: var(--text);
  padding: 12px 14px;
  font-size: 14px;
}

.mdetailTitle{
  font-size: 16px;
  font-weight: 600;
}

.mdetailSummary{
  resize: vertical;
  line-height: 1.6;
}

.mdetailContent{
  min-height: 240px;
  height: 100%;
  resize: vertical;
  line-height: 1.7;
}

.dangerGhost{
  color: var(--danger);
}

@media (max-width: 760px){
  .mdetailHead{
    flex-direction: column;
    align-items: stretch;
  }

  .mdetailActions{
    flex-direction: column;
  }

  .sourceSummaryGrid{
    grid-template-columns: 1fr;
  }
}
</style>
