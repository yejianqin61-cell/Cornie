<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { MessagesSquare } from '@lucide/vue'
import MessageRow from './MessageRow.vue'
import EmptyState from '../common/EmptyState.vue'
import { getChatDay } from '../../api/chatlog.js'
import { listConfirmations } from '../../api/confirm.js'

const MESSAGE_PAGE_SIZE = 100
const MAX_MESSAGE_PAGES = 20

const props = defineProps({
  date: { type: String, required: true },
  transientMessages: { type: Array, default: () => [] },
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
    <div v-if="loading && messages.length === 0 && visibleTransientMessages.length === 0" class="chat-history-loading">
      <div class="chat-history-skeleton" v-for="n in 3" :key="n">
        <div class="skeleton-avatar" />
        <div class="skeleton-bubble" />
      </div>
    </div>
    <div v-else-if="error" class="chat-history-error">
      <span>{{ error }}</span>
      <button class="chat-history-retry" @click="load">重试</button>
    </div>
    <EmptyState
      v-else-if="messages.length === 0 && visibleTransientMessages.length === 0"
      :icon="MessagesSquare"
      text="暂无消息"
    />
    <div v-else class="chat-history-messages">
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

.chat-history-loading,
.chat-history-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 1rem;
}

.chat-history-skeleton {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
}

.skeleton-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--nb-border);
  animation: pulse 1.5s infinite;
}

.skeleton-bubble {
  height: 32px;
  flex: 1;
  max-width: 60%;
  border-radius: 0.75rem;
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

.chat-history-error {
  color: var(--nb-danger, #d32f2f);
  font-size: 0.85rem;
  font-weight: 600;
}

.chat-history-retry {
  border: 2px solid #000;
  border-radius: 0.5rem;
  background: #fff;
  padding: 0.35rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.chat-history-messages {
  display: flex;
  flex-direction: column;
}
</style>
