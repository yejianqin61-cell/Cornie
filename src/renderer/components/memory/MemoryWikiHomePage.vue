<script setup>
import { ref, computed } from 'vue'
import { Brain, Plus } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import PageHeader from '../common/PageHeader.vue'
import MemoryWikiTree from './MemoryWikiTree.vue'
import MemoryWikiDetail from './MemoryWikiDetail.vue'
import MemoryWikiCompare from './MemoryWikiCompare.vue'
import MemoryWikiEditor from './MemoryWikiEditor.vue'
import MemoryWikiEmptyState from './MemoryWikiEmptyState.vue'
import { listPages, getPage, createPage, updatePage, listVersions, getVersionDiff } from '../../api/memory-wiki.js'

const pages = ref([])
const selectedPage = ref(null)
const compareOpen = ref(false)
const compareData = ref({})
const editorOpen = ref(false)
const editorInitial = ref({})

async function fetchPages() {
  try {
    const res = await listPages()
    pages.value = res.items || []
  } catch {
    pages.value = []
  }
}

fetchPages()

async function selectPage(pageId) {
  try {
    const res = await getPage(pageId)
    selectedPage.value = res.page
  } catch {
    selectedPage.value = null
  }
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
  } catch {
    // ignore
  }
}

function openNew() {
  editorInitial.value = {}
  editorOpen.value = true
}

function openEdit() {
  editorInitial.value = { ...(selectedPage.value || {}) }
  editorOpen.value = true
}

async function onSave(formData) {
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
  } catch {
    // ignore
  }
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

    <div class="mw-layout" v-if="pages.length > 0">
      <div class="mw-sidebar">
        <MemoryWikiTree
          :items="pages"
          :activePageId="selectedPage?.pageId || selectedPage?.id"
          @select="selectPage"
        />
      </div>
      <div class="mw-main">
        <MemoryWikiDetail
          v-if="selectedPage"
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
      @save="onSave"
      @cancel="editorOpen = false; editorInitial = {}"
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
</style>