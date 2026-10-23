<script setup>
import { ref } from 'vue'
import { Brain, Plus, RefreshCw, Loader2, Shield, Hash } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import PageHeader from '../common/PageHeader.vue'
import MemoryWikiTree from './MemoryWikiTree.vue'
import MemoryWikiDetail from './MemoryWikiDetail.vue'
import MemoryWikiCompare from './MemoryWikiCompare.vue'
import MemoryWikiEditor from './MemoryWikiEditor.vue'
import MemoryWikiEmptyState from './MemoryWikiEmptyState.vue'
import {
  listPages,
  getPage,
  createPage,
  updatePage,
  listVersions,
  getVersionDiff,
  listTopics,
  listGovernance,
  getPageSourceTrace,
  getGovernanceRequest,
  updateGovernanceStatus,
  applyGovernanceRequest,
  archivePage,
  restorePage,
  rollbackPage,
  updatePageImportance,
} from '../../api/memory-wiki.js'

const pages = ref([])
const allPages = ref([])
const loading = ref(false)
const error = ref('')
const selectedPage = ref(null)
const pageLoading = ref(false)
const selectedVersions = ref([])
const compareOpen = ref(false)
const compareData = ref({})
const editorOpen = ref(false)
const editorInitial = ref({})
const saving = ref(false)
const saveError = ref('')

const topics = ref([])
const activeTopic = ref('')
const governanceOpen = ref(false)
const governanceItems = ref([])
const governanceLoading = ref(false)
const governanceSelected = ref(null)
const governanceError = ref('')
const governanceResult = ref(null)

async function fetchPages() {
  loading.value = true
  error.value = ''
  try {
    const res = await listPages({})
    allPages.value = res.items || []
    applyTopicFilter()
  } catch (e) {
    allPages.value = []
    pages.value = []
    error.value = e.message || '加载失败'
  }
  loading.value = false
}

fetchPages()

async function loadTopics() {
  try {
    const res = await listTopics()
    topics.value = res.items || []
    applyTopicFilter()
  } catch {
    /* ignore */
  }
}

loadTopics()

function filterByTopic(topic) {
  activeTopic.value = activeTopic.value === topic ? '' : topic
  applyTopicFilter()
}

function applyTopicFilter() {
  if (!activeTopic.value) {
    pages.value = [...allPages.value]
    return
  }
  const topic = topics.value.find((item) => (item.normalizedKey || item.key) === activeTopic.value)
  const pageIds = new Set(Array.isArray(topic?.memoryPageIds) ? topic.memoryPageIds : [])
  pages.value = allPages.value.filter((page) => pageIds.has(page.pageId || page.id))
}

async function selectPage(pageId) {
  pageLoading.value = true
  try {
    const [res, versionRes, traceRes] = await Promise.all([
      getPage(pageId),
      listVersions(pageId),
      getPageSourceTrace(pageId),
    ])
    const trace = traceRes.trace || {}
    const sources = [
      ...(trace.chatSources || []).map((item) => ({
        label: item.exists ? `${item.title}：${item.preview}` : `${item.title}（来源已不可用）`,
      })),
      ...(trace.observationSources || []).map((item) => ({
        label: item.exists ? `${item.title}：${item.preview}` : `${item.title}（来源已不可用）`,
      })),
    ]
    selectedPage.value = { ...res.page, sources }
    selectedVersions.value = versionRes.items || []
  } catch {
    selectedPage.value = null
    selectedVersions.value = []
  }
  pageLoading.value = false
}

async function refreshSelectedPage() {
  if (!selectedPage.value?.pageId) return
  await fetchPages()
  await selectPage(selectedPage.value.pageId)
}

async function runPageAction(action) {
  if (!selectedPage.value?.pageId) return
  try {
    await action(selectedPage.value.pageId)
    await refreshSelectedPage()
  } catch (e) {
    error.value = e.message || '记忆操作失败'
  }
}

function archiveSelectedPage() {
  return runPageAction(archivePage)
}
function restoreSelectedPage() {
  return runPageAction(restorePage)
}
function updateSelectedImportance(importance) {
  return runPageAction((pageId) => updatePageImportance(pageId, importance))
}
function rollbackSelectedPage(versionId) {
  if (!versionId) return
  return runPageAction((pageId) => rollbackPage(pageId, versionId))
}

async function openCompare() {
  if (!selectedPage.value?.pageId) return
  try {
    const res = await listVersions(selectedPage.value.pageId)
    const versions = res.items || []
    if (versions.length >= 2) {
      const diffRes = await getVersionDiff(selectedPage.value.pageId, {
        fromVersionId: versions[1].versionId,
        toVersionId: versions[0].versionId,
      })
      compareData.value = {
        diff: diffRes.diff || {},
        fromVersion: versions[1],
        toVersion: versions[0],
      }
    } else {
      compareData.value = { unavailable: true }
    }
    compareOpen.value = true
  } catch {
    /* ignore */
  }
}

async function openGovernance() {
  governanceOpen.value = true
  governanceSelected.value = null
  governanceError.value = ''
  governanceResult.value = null
  await loadGovernance()
}

async function loadGovernance() {
  governanceLoading.value = true
  try {
    const res = await listGovernance()
    governanceItems.value = res.items || []
  } catch (e) {
    governanceItems.value = []
    governanceError.value = e.message || '治理请求加载失败'
  }
  governanceLoading.value = false
}

async function selectGovernance(requestId) {
  governanceError.value = ''
  try {
    const res = await getGovernanceRequest(requestId)
    governanceSelected.value = res.item || null
  } catch (e) {
    governanceError.value = e.message || '治理详情加载失败'
  }
}

async function decideGovernance(status) {
  if (!governanceSelected.value?.requestId) return
  governanceError.value = ''
  try {
    const res = await updateGovernanceStatus(governanceSelected.value.requestId, status)
    governanceSelected.value = res.item || governanceSelected.value
    await loadGovernance()
  } catch (e) {
    governanceError.value = e.message || '治理决定保存失败'
  }
}

async function applyGovernance() {
  if (governanceSelected.value?.status !== 'approved') return
  governanceError.value = ''
  try {
    const res = await applyGovernanceRequest(governanceSelected.value.requestId)
    governanceResult.value = res.result || null
    await loadGovernance()
  } catch (e) {
    governanceError.value = e.message || '治理请求应用失败'
  }
}

function openNew() {
  editorInitial.value = {}
  saveError.value = ''
  editorOpen.value = true
}

function openEdit() {
  editorInitial.value = { ...(selectedPage.value || {}) }
  saveError.value = ''
  editorOpen.value = true
}

async function onSave(formData) {
  saving.value = true
  saveError.value = ''
  const editedPageId = editorInitial.value?.pageId || ''
  try {
    if (editedPageId) {
      await updatePage(editedPageId, formData)
    } else {
      await createPage(formData)
    }
    editorOpen.value = false
    editorInitial.value = {}
    await fetchPages()
    if (selectedPage.value?.pageId === editedPageId) {
      await selectPage(editedPageId)
    }
  } catch (e) {
    saveError.value = e.message || '保存失败'
  }
  saving.value = false
}

function goBack() {
  selectedPage.value = null
}
</script>

<template>
  <div class="mw-home" aria-label="记忆工作区">
    <div class="mw-toolbar">
      <PageHeader title="记忆" :icon="Brain" />
      <div class="mw-toolbar-actions">
        <Button variant="neutral" size="sm" @click="openGovernance">
          <Shield :size="14" />
          治理
        </Button>
        <Button variant="neutral" size="sm" @click="openNew">
          <Plus :size="14" />
          新建
        </Button>
      </div>
    </div>

    <div v-if="topics.length > 0" class="mw-topics">
      <Button
        v-for="t in topics"
        :key="t.normalizedKey || t.key"
        :variant="activeTopic === (t.normalizedKey || t.key) ? '' : 'neutral'"
        size="sm"
        @click="filterByTopic(t.normalizedKey || t.key)"
      >
        <Hash :size="12" />
        {{ t.normalizedKey || t.key }}
      </Button>
    </div>

    <div v-if="loading" class="mw-skeleton">
      <div class="mw-skeleton-line" v-for="n in 4" :key="n" />
    </div>
    <div v-else-if="error" class="mw-banner mw-banner--error">
      <span>{{ error }}</span>
      <Button variant="neutral" size="sm" @click="fetchPages"> <RefreshCw :size="12" /> 重试 </Button>
    </div>
    <div v-else-if="pages.length > 0" class="mw-layout">
      <div class="mw-sidebar">
        <MemoryWikiTree :items="pages" :activePageId="selectedPage?.pageId || selectedPage?.id" @select="selectPage" />
      </div>
      <div class="mw-main">
        <div v-if="pageLoading" class="mw-skeleton">
          <div class="mw-skeleton-line" v-for="n in 3" :key="n" />
        </div>
        <MemoryWikiDetail
          v-else-if="selectedPage"
          :page="selectedPage"
          :versions="selectedVersions"
          @back="goBack"
          @edit="openEdit"
          @compare="openCompare"
          @archive="archiveSelectedPage"
          @restore="restoreSelectedPage"
          @rollback="rollbackSelectedPage"
          @importance="updateSelectedImportance"
        />
        <MemoryWikiEmptyState v-else />
      </div>
    </div>

    <MemoryWikiEmptyState v-else />

    <MemoryWikiEditor
      v-if="editorOpen"
      :page="editorInitial"
      :saving="saving"
      :saveError="saveError"
      @save="onSave"
      @cancel="
        editorOpen = false
        editorInitial = {}
        saveError = ''
      "
    />

    <MemoryWikiCompare v-if="compareOpen" v-bind="compareData" @close="compareOpen = false" />

    <div v-if="governanceOpen" class="mw-governance-overlay" @click.self="governanceOpen = false">
      <div class="mw-governance">
        <div class="mw-governance-header">
          <h3>治理面板</h3>
          <Button variant="neutral" size="icon" @click="governanceOpen = false">
            <span>&times;</span>
          </Button>
        </div>
        <div v-if="governanceLoading" class="mw-skeleton">
          <div class="mw-skeleton-line" v-for="n in 3" :key="n" />
        </div>
        <div v-else-if="governanceItems.length === 0" class="mw-governance-empty">暂无治理请求</div>
        <template v-else>
          <div class="mw-governance-list">
            <button
              v-for="item in governanceItems"
              :key="item.requestId"
              class="mw-governance-item"
              :class="{ 'mw-governance-item--active': governanceSelected?.requestId === item.requestId }"
              @click="selectGovernance(item.requestId)"
            >
              <div class="mw-governance-item-head">
                <span class="mw-governance-item-type">{{ item.requestType }}</span>
                <span class="mw-governance-item-status">{{ item.status }}</span>
              </div>
              <div class="mw-governance-item-id">{{ item.requestId }}</div>
            </button>
          </div>
          <div v-if="governanceSelected" class="mw-governance-detail">
            <div><strong>原因：</strong>{{ governanceSelected.reason || '未提供原因' }}</div>
            <div><strong>证据：</strong></div>
            <pre v-if="governanceSelected.evidence?.length">{{
              JSON.stringify(governanceSelected.evidence, null, 2)
            }}</pre>
            <div v-else class="mw-governance-empty">此请求没有附带证据。</div>
            <div class="mw-governance-actions">
              <Button
                v-if="governanceSelected.status === 'pending'"
                variant="neutral"
                size="sm"
                @click="decideGovernance('approved')"
                >批准</Button
              >
              <Button
                v-if="governanceSelected.status === 'pending'"
                variant="neutral"
                size="sm"
                @click="decideGovernance('rejected')"
                >拒绝</Button
              >
              <Button
                v-if="governanceSelected.status === 'approved'"
                variant="neutral"
                size="sm"
                @click="applyGovernance"
                >应用</Button
              >
            </div>
          </div>
          <pre v-if="governanceResult" class="mw-governance-result">{{
            JSON.stringify(governanceResult, null, 2)
          }}</pre>
        </template>
        <div v-if="governanceError" class="mw-banner mw-banner--error">
          <span>{{ governanceError }}</span>
          <Button variant="neutral" size="sm" @click="loadGovernance">重试</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mw-home {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.25rem;
  gap: 1rem;
}

.mw-toolbar-actions {
  display: flex;
  gap: 0.5rem;
}

.mw-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.mw-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.25rem;
  flex: 1;
  overflow: hidden;
}

.mw-sidebar {
  border: 2px solid var(--nb-border);
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: var(--nb-background);
  overflow-y: auto;
}

.mw-main {
  border: 2px solid var(--nb-border);
  border-radius: 0.75rem;
  padding: 1.25rem;
  background: var(--nb-background);
  overflow-y: auto;
}

.mw-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: 2px solid #000;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.mw-banner--error {
  background: #fff0f0;
  color: var(--nb-danger, #d32f2f);
}

.mw-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mw-skeleton-line {
  height: 44px;
  border-radius: 0.5rem;
  background: var(--nb-border);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

.mw-governance-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.mw-governance {
  background: var(--nb-background);
  border: 2px solid #000;
  border-radius: 0.75rem;
  padding: 1.25rem;
  width: 500px;
  max-width: 90vw;
  max-height: 70vh;
  overflow-y: auto;
}

.mw-governance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.mw-governance-header h3 {
  font-size: 1.1rem;
  font-weight: 800;
}

.mw-governance-empty {
  font-size: 0.85rem;
  color: var(--nb-text-secondary);
  text-align: center;
  padding: 2rem 0;
}

.mw-governance-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mw-governance-item {
  width: 100%;
  text-align: left;
  background: transparent;
  border: 2px solid #000;
  border-radius: 0.5rem;
  padding: 0.75rem;
  cursor: pointer;
}
.mw-governance-item--active {
  background: var(--nb-hover);
}

.mw-governance-item-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.mw-governance-item-type {
  font-size: 0.75rem;
  font-weight: 700;
}

.mw-governance-item-status {
  font-size: 0.65rem;
  padding: 1px 6px;
  border: 1.5px solid #000;
  border-radius: 99px;
}

.mw-governance-item-id {
  font-size: 0.7rem;
  color: var(--nb-text-secondary);
  word-break: break-all;
}
.mw-governance-detail {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 0.82rem;
}
.mw-governance-detail pre,
.mw-governance-result {
  margin: 0;
  padding: 0.5rem;
  background: var(--nb-hover);
  border-radius: 0.5rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.mw-governance-actions {
  display: flex;
  gap: 0.5rem;
}
</style>
