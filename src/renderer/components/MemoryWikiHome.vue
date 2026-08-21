<script setup>
// T-02：记忆 Wiki 双栏容器（Cornie-024）——左文件树 + 右正文阅读/编辑。
// 替代旧"列表视图 → 详情视图"跳转：选树节点即右侧加载，新建就地开空编辑页。

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { listMemoryWikiPages } from '../api'
import { listenDataChanged } from '../syncSignals'
import { useDebouncedValue } from '../composables/useTimers'
import MemoryWikiTree from './MemoryWikiTree.vue'
import MemoryPageDetail from './MemoryPageDetail.vue'

const emit = defineEmits(['open-observation', 'open-chat-source'])

const pages = ref([])
const loading = ref(false)
const searchQuery = ref('')

// T-05：选中与展开状态持久化（localStorage）
const STORAGE_KEY = 'cornie.memory-wiki.tree'

function readStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // localStorage 不可用时静默
  }
  return null
}

const storedState = readStoredState() || {}
const selectedId = ref(typeof storedState.selectedId === 'string' ? storedState.selectedId : '')
const creating = ref(false)
const expandedKeys = ref(
  Array.isArray(storedState.expanded) && storedState.expanded.length > 0
    ? storedState.expanded
    : ['identity_profile', 'identity_person', 'identity_preference', 'identity_trait']
)

function persistState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedId: selectedId.value, expanded: expandedKeys.value })
    )
  } catch {
    // 忽略写入失败
  }
}

// T-03：树顶搜索——标题/别名/摘要模糊匹配（防抖 220ms）
const filteredPages = ref([])
useDebouncedValue(searchQuery, 220, (value) => {
  const keyword = String(value || '').trim().toLowerCase()
  if (!keyword) {
    filteredPages.value = pages.value
    return
  }
  filteredPages.value = pages.value.filter((page) => {
    return [page?.title, page?.aliasesText, page?.summary]
      .filter(Boolean)
      .some((text) => String(text).toLowerCase().includes(keyword))
  })
})

const isSearching = computed(() => String(searchQuery.value || '').trim().length > 0)
const searchNoResult = computed(() => isSearching.value && filteredPages.value.length === 0)

async function refresh() {
  try {
    const [activeData, archivedData] = await Promise.all([
      listMemoryWikiPages({ status: 'active', limit: 500, offset: 0 }),
      listMemoryWikiPages({ status: 'archived', limit: 500, offset: 0 })
    ])
    pages.value = [...(activeData?.pages || []), ...(archivedData?.pages || [])]
    // 选中页被删除/归档移除后清空选中
    if (selectedId.value && !pages.value.some((p) => p.id === selectedId.value)) {
      selectedId.value = ''
    }
    // 同步当前搜索过滤
    if (String(searchQuery.value || '').trim()) {
      const keyword = String(searchQuery.value).trim().toLowerCase()
      filteredPages.value = pages.value.filter((page) =>
        [page?.title, page?.aliasesText, page?.summary]
          .filter(Boolean)
          .some((text) => String(text).toLowerCase().includes(keyword))
      )
    } else {
      filteredPages.value = pages.value
    }
  } catch {
    // 加载失败静默（树为空态）
  }
}

let stopListening = () => {}

onMounted(async () => {
  loading.value = true
  await refresh()
  loading.value = false
  stopListening = listenDataChanged((detail) => {
    if (detail?.memory) refresh()
  })
})

onBeforeUnmount(() => {
  stopListening()
})

function selectPage(page) {
  selectedId.value = page?.id || ''
  creating.value = false
  persistState()
}

function onToggle(key) {
  const next = new Set(expandedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedKeys.value = [...next]
  persistState()
}

function startCreate() {
  creating.value = true
  selectedId.value = ''
  persistState()
}

function onCreated(id) {
  creating.value = false
  refresh().then(() => {
    selectedId.value = id
    persistState()
  })
}

function onDeleted() {
  creating.value = false
  selectedId.value = ''
  persistState()
  refresh()
}

function onBack() {
  selectedId.value = ''
  creating.value = false
  persistState()
}

function onOpenMemory(id) {
  creating.value = false
  selectedId.value = id
  persistState()
}
</script>

<template>
  <div class="wikiHome">
    <div class="wikiHead">
      <div class="wikiTitle">记忆 Wiki</div>
      <input
        v-model="searchQuery"
        class="wikiSearch"
        type="text"
        placeholder="搜索记忆…"
      />
      <button class="primary" type="button" @click="startCreate">新建记忆</button>
    </div>

    <div class="wikiBody">
      <aside class="wikiSidebar">
        <div v-if="loading" class="wikiSideLoading">加载中…</div>
        <template v-else>
          <div v-if="isSearching" class="wikiSearchMeta">
            {{ searchNoResult ? '没有找到相关的记忆' : `搜索结果：${filteredPages.length} 条` }}
          </div>
          <div v-if="searchNoResult" class="wikiSearchEmpty">换个关键词试试。</div>
          <MemoryWikiTree
            v-else
            :pages="filteredPages"
            :selected-id="selectedId"
            :expanded-keys="expandedKeys"
            @select="selectPage"
            @toggle="onToggle"
          />
        </template>
      </aside>

      <main class="wikiContent">
        <template v-if="creating">
          <MemoryPageDetail
            key="memory-create"
            @back="onBack"
            @created="onCreated"
            @open-observation="(id) => emit('open-observation', id)"
            @open-chat-source="(payload) => emit('open-chat-source', payload)"
          />
        </template>
        <MemoryPageDetail
          v-else-if="selectedId"
          :key="selectedId"
          :id="selectedId"
          @back="onBack"
          @deleted="onDeleted"
          @open-observation="(id) => emit('open-observation', id)"
          @open-chat-source="(payload) => emit('open-chat-source', payload)"
          @open-memory="onOpenMemory"
        />
        <div v-else class="wikiEmpty">
          <div class="wikiEmptyIcon">📖</div>
          <div class="wikiEmptyText">从左边选一页记忆，在这里慢慢看。</div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.wikiHome{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}
.wikiHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}
.wikiTitle{ font-size: 18px; font-weight: 800; }

/* T-03：搜索框 */
.wikiSearch{
  width: 220px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  font-size: 13px;
  background: var(--surface-2, #fff);
}
.wikiSearch:focus{ outline: none; border-color: rgba(232,133,106,.4); }

.wikiSearchMeta{
  padding: 8px 12px;
  font-size: 12px;
  color: var(--muted);
  border-bottom: 1px solid rgba(0,0,0,.05);
}
.wikiSearchEmpty{ padding: 20px 12px; text-align: center; font-size: 13px; color: var(--muted); }

.wikiBody{
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 12px;
}
.wikiSidebar{
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  overflow: hidden;
  min-height: 0;
}
.wikiSideLoading{ padding: 16px; color: var(--muted); font-size: 13px; text-align: center; }
.wikiContent{
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  overflow: hidden;
  min-height: 0;
}
.wikiEmpty{
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted);
}
.wikiEmptyIcon{ font-size: 32px; }
.wikiEmptyText{ font-size: 13px; }

@media (max-width: 760px){
  .wikiBody{ grid-template-columns: 1fr; }
  .wikiSidebar{ max-height: 240px; }
}
</style>
