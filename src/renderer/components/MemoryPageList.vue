<script setup>
import { onMounted, ref } from 'vue'
import { listMemoryWikiPages } from '../api'

const IDENTITY_MEMORY_PAGE_TYPES = new Set([
  'identity_profile',
  'identity_preference',
  'identity_trait',
  'identity_person'
])

const pages = ref([])
const loading = ref(false)
const errorMsg = ref('')

const PAGE_TYPE_LABELS = {
  identity_profile: '关于你',
  identity_person: '重要的人',
  identity_preference: '你的偏好',
  identity_trait: '你的特征'
}

async function refresh() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await listMemoryWikiPages({ status: 'active' })
    pages.value = (data?.pages || []).filter((page) => IDENTITY_MEMORY_PAGE_TYPES.has(page.pageType))
  } catch (e) {
    errorMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function truncated(text, maxLen = 100) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

function pageTypeLabel(pageType) {
  return PAGE_TYPE_LABELS[pageType] || '长期记忆'
}

onMounted(refresh)
</script>

<template>
  <div class="mlist">
    <header class="mlistHead">
      <button class="ghost" @click="$emit('back')">← 返回观察与记忆</button>
      <div class="mlistHeadMain">
        <div class="mlistTitle">我的记忆</div>
        <div class="mlistHint">铃湾记住的关于你的事</div>
      </div>
      <button class="primary" @click="$emit('go', 'memory-create')">新建记忆</button>
    </header>

    <div v-if="errorMsg" class="mlistError">{{ errorMsg }}</div>
    <div v-if="loading" class="mlistLoading">翻翻记忆…</div>

    <div v-else-if="pages.length === 0" class="mlistEmpty">
      <div class="mlistEmptyIcon">📝</div>
      <div>铃湾还在慢慢记住关于你的事</div>
      <button class="primary mlistEmptyAction" @click="$emit('go', 'memory-create')">写下一页记忆</button>
    </div>

    <div v-else class="mlistList">
      <div
        v-for="page in pages"
        :key="page.id"
        class="mlistCard card"
        @click="$emit('go', 'memory-detail', page.id)"
      >
        <div class="mlistCardTitle">{{ page.title }}</div>
        <div class="mlistCardSummary" v-if="page.summary">{{ truncated(page.summary, 120) }}</div>
        <div class="mlistCardSummary" v-else>{{ truncated(page.content, 120) }}</div>
        <div class="mlistCardType">{{ pageTypeLabel(page.pageType) }}</div>
        <div class="mlistCardMeta">{{ page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('zh-CN') : '' }}</div>
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
.mlistHeadMain{ flex: 1; min-width: 0; }
.mlistTitle{ font-size: 18px; font-weight: 800; }
.mlistHint{ font-size: 12px; color: var(--muted); margin-top: 2px; }

.mlistError{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  font-size: 13px;
}
.mlistLoading{ text-align: center; color: var(--muted); padding: 30px; }

.mlistEmpty{
  text-align: center;
  color: var(--muted);
  padding: 40px;
  border: 1px dashed var(--border);
  border-radius: 14px;
}
.mlistEmptyIcon{ font-size: 28px; margin-bottom: 8px; }
.mlistEmptyAction{ margin-top: 12px; }

.mlistList{
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}
.mlistList::-webkit-scrollbar{ width: 4px; }
.mlistList::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.mlistCard{
  padding: 16px;
  cursor: pointer;
}
.mlistCard:hover{ border-color: rgba(232,133,106,.20); }
.mlistCardTitle{ font-weight: 600; margin-bottom: 6px; }
.mlistCardSummary{ font-size: 13px; color: var(--muted); line-height: 1.5; }
.mlistCardType{ font-size: 11px; color: var(--muted); margin-top: 8px; }
.mlistCardMeta{ font-size: 11px; color: var(--muted); margin-top: 8px; }

@media (max-width: 760px){
  .mlistHead{
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
