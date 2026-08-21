<script setup>
// T-02：记忆 Wiki 双栏容器（Cornie-024）——左文件树 + 右正文阅读/编辑。
// 替代旧"列表视图 → 详情视图"跳转：选树节点即右侧加载，新建就地开空编辑页。

import { onBeforeUnmount, onMounted, ref } from 'vue'
import { listMemoryWikiPages } from '../api'
import { listenDataChanged } from '../syncSignals'
import MemoryWikiTree from './MemoryWikiTree.vue'
import MemoryPageDetail from './MemoryPageDetail.vue'

const emit = defineEmits(['open-observation', 'open-chat-source'])

const pages = ref([])
const loading = ref(false)
const selectedId = ref('')
const creating = ref(false)

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
}

function startCreate() {
  creating.value = true
  selectedId.value = ''
}

function onCreated(id) {
  creating.value = false
  refresh().then(() => {
    selectedId.value = id
  })
}

function onDeleted() {
  creating.value = false
  selectedId.value = ''
  refresh()
}

function onBack() {
  selectedId.value = ''
  creating.value = false
}

function onOpenMemory(id) {
  creating.value = false
  selectedId.value = id
}
</script>

<template>
  <div class="wikiHome">
    <div class="wikiHead">
      <div class="wikiTitle">记忆 Wiki</div>
      <button class="primary" type="button" @click="startCreate">新建记忆</button>
    </div>

    <div class="wikiBody">
      <aside class="wikiSidebar">
        <div v-if="loading" class="wikiSideLoading">加载中…</div>
        <MemoryWikiTree
          v-else
          :pages="pages"
          :selected-id="selectedId"
          @select="selectPage"
        />
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
