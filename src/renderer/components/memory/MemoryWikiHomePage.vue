<script setup>
import { ref } from 'vue'
import { Brain, Plus, RefreshCw, Loader2 } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import PageHeader from '../common/PageHeader.vue'
import MemoryWikiTree from './MemoryWikiTree.vue'
import MemoryWikiDetail from './MemoryWikiDetail.vue'
import MemoryWikiCompare from './MemoryWikiCompare.vue'
import MemoryWikiEditor from './MemoryWikiEditor.vue'
import MemoryWikiEmptyState from './MemoryWikiEmptyState.vue'
import { listPages, getPage, createPage, updatePage, listVersions, getVersionDiff } from '../../api/memory-wiki.js'

const pages = ref([])
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

async function fetchPages() {
  loading.value = true
  error.value = ''
  try {
    const res = await listPages()
    pages.value = res.items || []
  } catch (e) {
    pages.value = []
    error.value = e.message || '加载失败'
  }
  loading.value = false
}

fetchPages()

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
    }
    compareOpen.value = true
  } catch { /* ignore */ }
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
  try {
    if (editorInitial.value?.pageId) {
      await updatePage(editorInitial.value.pageId, formData)
    } else {
      await createPage(formData)
    }
    editorOpen.value = false
    editorInitial.value = {}
    fetchPages()
    if (selectedPage.value?.pageId === editorInitial.value.pageId) {
      selectPage(editorInitial.value.pageId)
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
      <Button variant="neutral" size="sm" @click="openNew">
        <Plus :size="14" />
        新建
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

.mw-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
</style>