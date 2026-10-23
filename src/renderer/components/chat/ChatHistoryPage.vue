<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { MessagesSquare } from '@lucide/vue'
import MessageRow from './MessageRow.vue'
import EmptyState from '../common/EmptyState.vue'
import ErrorState from '../common/ErrorState.vue'
import LoadingState from '../common/LoadingState.vue'
import { getChatDay } from '../../api/chatlog.js'
import { listConfirmations } from '../../api/confirm.js'

const MESSAGE_PAGE_SIZE = 100
const MAX_MESSAGE_PAGES = 20

const props = defineProps({
  date: { type: String, required: true },
  transientMessages: { type: Array, default: () => [] },
  isToday: { type: Boolean, default: false },
})

defineEmits(['confirmResolved', 'retry'])

const messages = ref([])
const loading = ref(false)
const error = ref('')
const historyEl = ref(null)
const stickToBottom = ref(true)
const savedPositions = new Map()
let loadToken = 0

const visibleTransientMessages = computed(() =>
  props.transientMessages.filter((message) => !message.date || message.date === props.date)
)

const emptyText = computed(() => (props.isToday ? '今天还没有聊天记录' : '这一天没有聊天记录'))

async function loadConfirmations() {
  try {
    const res = await listConfirmations(props.date)
    return Array.isArray(res?.confirmations) ? res.confirmations : []
  } catch {
    return []
  }
}

function attachConfirmations(list, confirmations) {
  if (confirmations.length === 0) return list
  const byMessage = new Map(confirmations.map((item) => [item.conversationMessageId, item]))
  return list.map((message) =>
    byMessage.has(message.id) ? { ...message, confirm: byMessage.get(message.id) } : message
  )
}

async function load({ bottom = false } = {}) {
  const token = ++loadToken
  loading.value = true
  error.value = ''
  try {
    const collected = []
    let cursor
    let hasMore = true
    let pages = 0
    while (hasMore && pages < MAX_MESSAGE_PAGES) {
      const res = await getChatDay(props.date, { cursor, limit: MESSAGE_PAGE_SIZE })
      collected.push(...(res.messages || []))
      hasMore = Boolean(res.pagination?.hasMore)
      cursor = res.pagination?.nextCursor ?? undefined
      pages += 1
    }
    if (token !== loadToken) return
    const attached = attachConfirmations(collected, await loadConfirmations())
    if (token !== loadToken) return
    messages.value = attached
  } catch (e) {
    if (token !== loadToken) return
    error.value = e.message || '加载失败'
    messages.value = []
  } finally {
    if (token === loadToken) loading.value = false
  }
  if (token !== loadToken) return
  await restoreScroll(bottom)
}

function updateScrollState() {
  const element = historyEl.value
  if (!element) return
  stickToBottom.value = element.scrollHeight - element.scrollTop - element.clientHeight <= 24
  if (element.scrollHeight > 0) savedPositions.set(props.date, element.scrollTop)
}

function scrollToBottom() {
  const element = historyEl.value
  if (!element) return
  element.scrollTop = element.scrollHeight
  stickToBottom.value = true
  savedPositions.set(props.date, element.scrollTop)
}

async function restoreScroll(bottom = false) {
  await nextTick()
  const element = historyEl.value
  if (!element) return
  const saved = savedPositions.get(props.date)
  element.scrollTop = bottom || saved === undefined ? element.scrollHeight : saved
  updateScrollState()
}

watch(
  () => props.transientMessages,
  async () => {
    if (!stickToBottom.value) return
    await nextTick()
    scrollToBottom()
  },
  { deep: true }
)
watch(
  () => props.date,
  () => load(),
  { immediate: true }
)

defineExpose({ refresh: (options) => load(options) })
</script>

<template>
  <div ref="historyEl" class="chat-history" @scroll="updateScrollState">
    <LoadingState
      v-if="loading && messages.length === 0 && visibleTransientMessages.length === 0"
      text="正在加载对话"
    />
    <ErrorState v-else-if="error" :message="error" :on-retry="load" />
    <EmptyState
      v-else-if="messages.length === 0 && visibleTransientMessages.length === 0"
      :icon="MessagesSquare"
      :text="emptyText"
    />
    <div v-else class="chat-history-messages" role="log" aria-live="polite" aria-relevant="additions">
      <MessageRow
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        @confirm-resolved="$emit('confirmResolved', $event)"
      />
      <MessageRow
        v-for="msg in visibleTransientMessages"
        :key="msg.id"
        :message="msg"
        @confirm-resolved="$emit('confirmResolved', $event)"
        @retry="$emit('retry', $event)"
      />
    </div>
    <button
      v-if="!stickToBottom && messages.length + visibleTransientMessages.length > 0"
      class="chat-history-jump"
      @click="scrollToBottom"
    >
      回到最新
    </button>
  </div>
</template>

<style scoped>
.chat-history {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
}

.chat-history-jump {
  position: sticky;
  bottom: 0.5rem;
  align-self: center;
  margin-top: 0.5rem;
  padding: 0.3rem 0.9rem;
  border: 2px solid var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-accent);
  color: var(--nb-text);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 2px 2px 0 0 var(--nb-border);
}

.chat-history-messages {
  display: flex;
  flex-direction: column;
}
</style>
