<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { getChatlog } from '../api'
import UiButton from './ui/UiButton.vue'
import UiEmpty from './ui/UiEmpty.vue'

const props = defineProps({
  date: { type: String, required: true },
  focusMessageId: { type: String, default: '' },
})

const emit = defineEmits(['back'])
const messages = ref([])
const loading = ref(false)
const errorMsg = ref('')
const highlightedMessageId = ref('')
const messageRefs = ref(new Map())

function setMessageRef(id, el) {
  if (!id) return
  if (el) {
    messageRefs.value.set(id, el)
    return
  }
  messageRefs.value.delete(id)
}

async function focusMessageIfNeeded() {
  if (!props.focusMessageId) {
    highlightedMessageId.value = ''
    return
  }
  const target = messages.value.find((item) => String(item?.id || '') === String(props.focusMessageId))
  if (!target) {
    highlightedMessageId.value = ''
    return
  }
  await nextTick()
  const el = messageRefs.value.get(props.focusMessageId)
  if (el?.scrollIntoView) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  highlightedMessageId.value = props.focusMessageId
}

async function loadMessages() {
  if (!props.date) {
    messages.value = []
    highlightedMessageId.value = ''
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    const data = await getChatlog(props.date)
    messages.value = data.messages || []
    await focusMessageIfNeeded()
  } catch (error) {
    errorMsg.value = error?.message || '加载失败，请稍后再试'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.date,
  () => {
    loadMessages()
  }
)

watch(
  () => props.focusMessageId,
  () => {
    focusMessageIfNeeded()
  }
)

onMounted(async () => {
  await loadMessages()
})

function formatDateLabel(date) {
  if (!date) return ''
  const [y, m, d] = String(date).split('-')
  if (!y || !m || !d) return date
  return `${y}年${Number(m)}月${Number(d)}日`
}

function goBack() {
  emit('back')
}
</script>

<template>
  <div class="dayView">
    <header class="dayHead">
      <UiButton variant="ghost" @click="goBack">← 返回聊天记录</UiButton>
      <div class="dayDate">{{ formatDateLabel(date) }}</div>
      <div class="dayHint" v-if="!loading">{{ messages.length }} 条消息</div>
    </header>

    <div v-if="errorMsg" class="dayError">{{ errorMsg }}</div>

    <div v-if="loading" class="dayLoading">加载中…</div>

    <UiEmpty v-else-if="messages.length === 0" icon="💬" text="这一天还没有聊天记录" />

    <div v-else class="dayMessages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :ref="(el) => setMessageRef(msg.id, el)"
        class="dayBubble"
        :class="[
          msg.role === 'user' ? 'dayBubbleUser' : 'dayBubbleCornie',
          highlightedMessageId && msg.id === highlightedMessageId ? 'dayBubbleFocus' : '',
        ]"
      >
        <div class="dayRole">{{ msg.role === 'user' ? '你' : '铃湾' }}</div>
        <div class="dayText">{{ msg.content }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dayView {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.dayHead {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}
.dayDate {
  font-size: var(--text-xl);
  font-weight: 800;
}
.dayHint {
  font-size: var(--text-sm);
  color: var(--muted);
  margin-left: auto;
}

.dayMessages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dayMessages::-webkit-scrollbar {
  width: 4px;
}
.dayMessages::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-text) 10%, transparent);
  border-radius: 999px;
}

.dayBubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  line-height: 1.5;
  font-size: var(--text-md);
}
.dayBubbleUser {
  align-self: flex-end;
  background: var(--accent);
  color: var(--color-surface);
  border-bottom-right-radius: 6px;
}
.dayBubbleCornie {
  align-self: flex-start;
  background: var(--surface-2);
  border-bottom-left-radius: 6px;
}

.dayBubbleFocus {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent),
    0 12px 24px color-mix(in srgb, var(--color-accent) 14%, transparent);
}

.dayRole {
  font-size: var(--text-xs);
  opacity: 0.6;
  margin-bottom: 3px;
}
.dayText {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.dayLoading,
.dayEmpty,
.dayError {
  margin: 20px;
  padding: 12px;
  border-radius: var(--radius-md);
  text-align: center;
}
.dayLoading {
  color: var(--muted);
}
.dayEmpty {
  color: var(--muted);
}
.dayError {
  background: color-mix(in srgb, var(--color-danger) 6%, transparent);
  color: var(--danger);
}
</style>
