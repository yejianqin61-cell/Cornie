<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { exportChatlogByDate, exportChatlogByMonth, getChatlog, listChatlogDates } from './api'
import { useRequestGuard } from './composables/useRequestGuard'

import UiButton from './components/ui/UiButton.vue'

const emit = defineEmits(['back', 'open-date'])

// FE-05：快速切换日期时旧响应不得覆盖新视图。
const historyGuard = useRequestGuard()

function pad2(n) {
  return String(n).padStart(2, '0')
}
function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const today = new Date()
const selectedMonth = ref('')
const selectedScope = ref('all')
const selectedDate = ref(toISODate(today))
const searchQuery = ref('')
const entries = ref([])
const messages = ref([])
const availableMonths = ref([])
const datePagination = ref({ cursor: '0', nextCursor: null, hasMore: false, pageSize: 100, total: 0 })
const messagePagination = ref({ cursor: '0', nextCursor: null, hasMore: false, pageSize: 100, total: 0 })
const messageSearchMeta = ref({ query: '', mode: 'browse' })
const loadingDates = ref(false)
const loadingMessages = ref(false)
const exporting = ref(false)
const errorMsg = ref('')

const selectedLabel = computed(() => selectedDate.value || '未选择日期')
const activeMonthValue = computed(() => (selectedMonth.value === '' ? '__all__' : selectedMonth.value))
const selectedMonthLabel = computed(() => {
  if (!selectedMonth.value) return '全部历史'
  const [year, month] = selectedMonth.value.split('-')
  return `${year}年${Number(month)}月`
})
const selectedScopeLabel = computed(() => {
  if (selectedScope.value === 'recent_30_days') return '最近30天'
  if (selectedScope.value === 'month') return selectedMonthLabel.value
  return '全部历史'
})
const historySummary = computed(() => {
  const total = Number(datePagination.value?.total ?? entries.value.length)
  if (searchQuery.value.trim()) {
    return `搜索“${searchQuery.value.trim()}”命中 ${total} 个聊天日期`
  }
  if (selectedScope.value === 'recent_30_days') {
    return `${selectedScopeLabel.value} · ${total} 个聊天日期`
  }
  return `${selectedScopeLabel.value} · ${total} 个聊天日期`
})

async function refreshDates() {
  loadingDates.value = true
  errorMsg.value = ''
  try {
    const data = await listChatlogDates({
      month: selectedMonth.value || undefined,
      scope: selectedScope.value,
      query: searchQuery.value.trim() || undefined,
      limit: 60,
      cursor: 0,
    })
    entries.value = data.entries || []
    availableMonths.value = data.availableMonths || []
    datePagination.value = data.pagination || {
      cursor: '0',
      nextCursor: null,
      hasMore: false,
      pageSize: 100,
      total: entries.value.length,
    }

    if (!entries.value.find((item) => item.date === selectedDate.value) && entries.value.length > 0) {
      selectedDate.value = entries.value[0].date
    }
    if (entries.value.length === 0) {
      messages.value = []
    }
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    loadingDates.value = false
  }
}

async function refreshMessages(date) {
  if (!date) {
    messages.value = []
    return
  }

  const { token, signal } = historyGuard.begin('messages')
  loadingMessages.value = true
  errorMsg.value = ''
  try {
    const data = await getChatlog(date, {
      limit: 80,
      cursor: 0,
      query: searchQuery.value.trim() || undefined,
      signal,
    })
    if (!historyGuard.isCurrent('messages', token)) return
    messages.value = data.messages || []
    messagePagination.value = data.pagination || {
      cursor: '0',
      nextCursor: null,
      hasMore: false,
      pageSize: 100,
      total: 0,
    }
    messageSearchMeta.value = data.searchMeta || { query: '', mode: 'browse' }
  } catch (error) {
    if (!historyGuard.isCurrent('messages', token)) return
    errorMsg.value = error?.message || String(error)
    messages.value = []
  } finally {
    if (historyGuard.isCurrent('messages', token)) {
      loadingMessages.value = false
      historyGuard.end('messages', token)
    }
  }
}

async function loadMoreDates() {
  if (loadingDates.value || !datePagination.value?.hasMore) return
  loadingDates.value = true
  errorMsg.value = ''
  try {
    const data = await listChatlogDates({
      month: selectedMonth.value || undefined,
      scope: selectedScope.value,
      query: searchQuery.value.trim() || undefined,
      limit: datePagination.value.pageSize || 60,
      cursor: datePagination.value.nextCursor,
    })
    entries.value = [...entries.value, ...(data.entries || [])]
    datePagination.value = data.pagination || datePagination.value
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    loadingDates.value = false
  }
}

async function loadMoreMessages() {
  if (loadingMessages.value || !messagePagination.value?.hasMore || !selectedDate.value) return
  loadingMessages.value = true
  errorMsg.value = ''
  try {
    const data = await getChatlog(selectedDate.value, {
      limit: messagePagination.value.pageSize || 80,
      cursor: messagePagination.value.nextCursor,
      query: searchQuery.value.trim() || undefined,
    })
    messages.value = [...messages.value, ...(data.messages || [])]
    messagePagination.value = data.pagination || messagePagination.value
    messageSearchMeta.value = data.searchMeta || messageSearchMeta.value
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    loadingMessages.value = false
  }
}

function pickDate(date) {
  selectedDate.value = date
}

function openSelectedDate() {
  if (!selectedDate.value) return
  emit('open-date', selectedDate.value)
}

function downloadExportFile(payload) {
  const blob = new Blob([payload.content || ''], { type: payload.contentType || 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = payload.filename || 'chatlog-export.txt'
  anchor.click()
  URL.revokeObjectURL(url)
}

async function exportSelectedDate(format) {
  if (!selectedDate.value) return
  exporting.value = true
  errorMsg.value = ''
  try {
    const payload = await exportChatlogByDate(selectedDate.value, { format })
    downloadExportFile(payload)
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    exporting.value = false
  }
}

async function exportSelectedMonth(format) {
  if (!selectedMonth.value) return
  exporting.value = true
  errorMsg.value = ''
  try {
    const payload = await exportChatlogByMonth(selectedMonth.value, { format })
    downloadExportFile(payload)
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    exporting.value = false
  }
}

watch(selectedMonth, () => refreshDates())
watch(selectedScope, () => refreshDates())
watch(selectedDate, (date) => refreshMessages(date))
watch(searchQuery, () => refreshDates())

onMounted(async () => {
  await refreshDates()
  if (selectedDate.value) {
    await refreshMessages(selectedDate.value)
  }
})
</script>

<template>
  <div class="history">
    <aside class="historySidebar card">
      <div class="historyHead">
        <div class="historyHeadTop">
          <UiButton variant="ghost" class="historyBackBtn" type="button" @click="emit('back')">← 返回聊天</UiButton>
          <div class="historyTitle">聊天记录</div>
        </div>
        <div class="historyToolbar">
          <select v-model="selectedScope" class="monthInput">
            <option value="all">全部历史</option>
            <option value="recent_30_days">最近30天</option>
            <option value="month">指定月份</option>
          </select>
          <select
            v-model="activeMonthValue"
            class="monthInput"
            @change="selectedMonth = activeMonthValue === '__all__' ? '' : activeMonthValue"
          >
            <option value="__all__">全部历史</option>
            <option v-for="month in availableMonths" :key="month" :value="month">{{ month }}</option>
          </select>
          <input v-model="searchQuery" class="historySearchInput" type="search" placeholder="搜索聊天关键词" />
        </div>
        <div v-if="selectedScope === 'recent_30_days' && datePagination.total > 0" class="historyFilterHint">
          当前视角：最近 30 天历史归档
        </div>
        <div class="historyFilterHint">{{ historySummary }}</div>
      </div>

      <div class="historyList">
        <button
          v-for="item in entries"
          :key="item.date"
          class="historyRow"
          :class="{ active: item.date === selectedDate }"
          @click="pickDate(item.date)"
        >
          <div class="historyRowMain">
            <span>{{ item.date }}</span>
            <span v-if="item.matchedPreview" class="historyPreview">{{ item.matchedPreview }}</span>
          </div>
          <span class="historyCount">
            {{ item.matchedCount ? `${item.matchedCount} 命中` : `${item.messageCount} 条` }}
          </span>
        </button>
        <div v-if="entries.length === 0 && !loadingDates" class="historyEmptySm">
          {{ searchQuery.trim() ? '没有找到相关聊天记录' : '这里还没有聊天记录' }}
        </div>
        <UiButton
          v-if="datePagination.hasMore"
          variant="ghost"
          size="sm"
          class="historyMoreBtn"
          type="button"
          :disabled="loadingDates"
          @click="loadMoreDates"
        >
          {{ loadingDates ? '加载中…' : '查看更多日期' }}
        </UiButton>
      </div>
    </aside>

    <section class="historyContent card">
      <div class="historyContentHead">
        <div>
          <div class="historyTitle">{{ selectedLabel }}</div>
          <div class="historyHint">
            {{ loadingMessages ? '加载中…' : `${messagePagination.total || messages.length} 条消息` }}
          </div>
          <div v-if="messageSearchMeta.query" class="historyHint">
            当前按“{{ messageSearchMeta.query }}”筛选这一天的命中消息
          </div>
        </div>
        <div class="historyActions">
          <UiButton
            variant="ghost"
            type="button"
            :disabled="exporting || !selectedMonth"
            @click="exportSelectedMonth('json')"
          >
            {{ exporting ? '导出中…' : '导出本月 JSON' }}
          </UiButton>
          <UiButton
            variant="ghost"
            type="button"
            :disabled="exporting || !selectedDate"
            @click="exportSelectedDate('txt')"
          >
            {{ exporting ? '导出中…' : '导出当日 TXT' }}
          </UiButton>
          <UiButton
            variant="default"
            class="historyOpenBtn"
            type="button"
            :disabled="loadingMessages || !selectedDate"
            @click="openSelectedDate"
          >
            查看这一天
          </UiButton>
        </div>
      </div>

      <div v-if="errorMsg" class="historyError">{{ errorMsg }}</div>

      <div v-if="messages.length === 0 && !loadingMessages" class="historyEmpty">这一天还没有聊天记录。</div>

      <div v-else class="historyMessages">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="historyBubble"
          :class="msg.role === 'user' ? 'historyBubbleUser' : 'historyBubbleCornie'"
        >
          <div class="historyRole">{{ msg.role === 'user' ? '你' : '铃湾' }}</div>
          <div class="historyText">{{ msg.content }}</div>
          <div v-if="searchQuery.trim() && msg.matchedPreview" class="historyMatchedPreview">
            {{ msg.matchedPreview }}
          </div>
        </div>
        <UiButton
          v-if="messagePagination.hasMore"
          variant="ghost"
          size="sm"
          class="historyMoreBtn historyMoreMsgBtn"
          type="button"
          :disabled="loadingMessages"
          @click="loadMoreMessages"
        >
          {{ loadingMessages ? '加载中…' : '查看更多消息' }}
        </UiButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.history {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.historySidebar,
.historyContent {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.historyHead,
.historyContentHead {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.historyHeadTop {
  display: flex;
  align-items: center;
  gap: 10px;
}

.historyTitle {
  font-weight: 700;
}
.historyHint {
  margin-top: 4px;
  font-size: var(--text-sm);
  color: var(--muted);
}
.historyToolbar {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
.monthInput {
  width: 140px;
}
.historySearchInput {
  flex: 1;
  min-width: 0;
}
.historyFilterHint {
  margin-top: 8px;
  font-size: var(--text-sm);
  color: var(--muted);
}
.historyBackBtn {
  padding: 6px 10px;
}
.historyOpenBtn {
  flex: 0 0 auto;
}
.historyActions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.historyList {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  overflow: auto;
  flex: 1;
}

.historyRow {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-lg);
  text-align: left;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}
.historyRow:hover {
  background: var(--surface-2);
}
.historyRow.active {
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}

.historyCount {
  font-size: var(--text-sm);
  color: var(--muted);
  white-space: nowrap;
}
.historyRowMain {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.historyPreview {
  font-size: var(--text-sm);
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.historyMoreBtn {
  align-self: center;
  margin-top: 8px;
}

.historyContent {
  min-height: 0;
}

.historyMessages {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  overflow: auto;
  flex: 1;
}

.historyBubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  line-height: 1.5;
  font-size: var(--text-md);
}
.historyBubbleUser {
  align-self: flex-end;
  background: var(--accent);
  color: var(--color-surface);
  border-bottom-right-radius: 6px;
}
.historyBubbleCornie {
  align-self: flex-start;
  background: var(--surface-2);
  border-bottom-left-radius: 6px;
}

.historyRole {
  font-size: var(--text-xs);
  opacity: 0.6;
  margin-bottom: 3px;
}
.historyText {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.historyMatchedPreview {
  margin-top: 6px;
  font-size: var(--text-sm);
  color: var(--muted);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.historyEmptySm {
  padding: 20px 12px;
  text-align: center;
  font-size: var(--text-base);
  color: var(--muted);
}
.historyEmpty,
.historyError {
  margin: 16px;
  padding: 12px;
  border-radius: var(--radius-md);
}
.historyEmpty {
  color: var(--muted);
}
.historyError {
  background: color-mix(in srgb, var(--color-danger) 6%, transparent);
  color: var(--danger);
}

@media (max-width: 980px) {
  .history {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 720px) {
  .historyToolbar {
    flex-direction: column;
  }
  .monthInput {
    width: 100%;
  }
}
</style>
