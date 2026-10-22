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
  listPages, getPage, createPage, updatePage,
  listVersions, getVersionDiff, listTopics, listGovernance,
} from '../../api/memory-wiki.js'

const pages = ref([])
const allPages = ref([])
const loading = ref(false)
const error = ref('')
const selectedPage = ref(null)
const pageLoading = ref(false)
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
  } catch { /* ignore */ }
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
    const res = await getPage(pageId)
    selectedPage.value = res.page
  } catch {
    selectedPage.value = null
  }
  pageLoading.value = false
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
  } catch { /* ignore */ }
}

async function openGovernance() {
  governanceOpen.value = true
  governanceLoading.value = true
  try {
    const res = await listGovernance()
    governanceItems.value = res.items || []
  } catch {
    governanceItems.value = []
  }
  governanceLoading.value = false
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
  <div class="mw-home">
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
      <Button variant="neutral" size="sm" @click="fetchPages">
        <RefreshCw :size="12" /> 重试
      </Button>
    </div>
    <div v-else-if="pages.length > 0" class="mw-layout">
      <div class="mw-sidebar">
        <MemoryWikiTree
          :items="pages"
          :activePageId="selectedPage?.pageId || selectedPage?.id"
          @select="selectPage"
        />
      </div>
      <div class="mw-main">
        <div v-if="pageLoading" class="mw-skeleton">
          <div class="mw-skeleton-line" v-for="n in 3" :key="n" />
        </div>
        <MemoryWikiDetail
          v-else-if="selectedPage"
          :page="selectedPage"
          :versions="[]"
          @back="goBack"
          @edit="openEdit"
          @compare="openCompare"
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
      @cancel="editorOpen = false; editorInitial = {}; saveError = ''"
    />

    <MemoryWikiCompare
      v-if="compareOpen"
      v-bind="compareData"
      @close="compareOpen = false"
    />

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
        <div v-else-if="governanceItems.length === 0" class="mw-governance-empty">
          暂无治理请求
        </div>
        <div v-else class="mw-governance-list">
          <div
            v-for="item in governanceItems"
            :key="item.requestId"
            class="mw-governance-item"
          >
            <div class="mw-governance-item-head">
              <span class="mw-governance-item-type">{{ item.requestType }}</span>
              <span class="mw-governance-item-status">{{ item.status }}</span>
            </div>
            <div class="mw-governance-item-id">{{ item.requestId }}</div>
          </div>
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
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

.mw-governance-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; }

.mw-governance { background: var(--nb-background); border: 2px solid #000; border-radius: 0.75rem; padding: 1.25rem; width: 500px; max-width: 90vw; max-height: 70vh; overflow-y: auto; }

.mw-governance-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }

.mw-governance-header h3 { font-size: 1.1rem; font-weight: 800; }

.mw-governance-empty { font-size: 0.85rem; color: var(--nb-text-secondary); text-align: center; padding: 2rem 0; }

.mw-governance-list { display: flex; flex-direction: column; gap: 0.5rem; }

.mw-governance-item { border: 2px solid #000; border-radius: 0.5rem; padding: 0.75rem; }

.mw-governance-item-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }

.mw-governance-item-type { font-size: 0.75rem; font-weight: 700; }

.mw-governance-item-status { font-size: 0.65rem; padding: 1px 6px; border: 1.5px solid #000; border-radius: 99px; }

.mw-governance-item-id { font-size: 0.7rem; color: var(--nb-text-secondary); word-break: break-all; }
</style>
