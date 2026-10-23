<script setup>
import { ref, nextTick } from 'vue'
import { Send, Loader2, X } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import ChatDateNav from './ChatDateNav.vue'
import ChatHistoryPage from './ChatHistoryPage.vue'
import { sendMessageStreamed } from '../../api/conversation.js'
import { listChatDays } from '../../api/chatlog.js'
import { singaporeDate } from '../../../../shared/local-date.js'

const inputText = ref('')
const sending = ref(false)
const sendError = ref('')
const transientMessages = ref([])
const activeRequest = ref(null)

const days = ref([])
const selectedDate = ref('')
const daysLoading = ref(false)

const historyRef = ref(null)

function todayStr() {
  return singaporeDate()
}

async function loadDays() {
  daysLoading.value = true
  try {
    const res = await listChatDays()
    days.value = (res.entries || []).map((entry) => ({
      date: entry.date,
      label: entry.date === todayStr() ? '今天' : entry.date.slice(5),
    }))
    if (days.value.length > 0) selectedDate.value = days.value[days.value.length - 1].date
  } catch {
    days.value = [{ date: todayStr(), label: '今天' }]
    selectedDate.value = todayStr()
  } finally {
    daysLoading.value = false
  }
}

loadDays()

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || sending.value) return
  const controller = new AbortController()
  sending.value = true
  sendError.value = ''
  inputText.value = ''
  activeRequest.value = controller
  transientMessages.value = [
    { id: `pending-user-${Date.now()}`, role: 'user', text },
    { id: `pending-assistant-${Date.now()}`, role: 'assistant', text: '' },
  ]
  try {
    let streamError = null
    await sendMessageStreamed(
      { message: text, date: selectedDate.value },
      (delta) => {
        const assistant = transientMessages.value.at(-1)
        if (assistant) assistant.text += delta
      },
      () => {},
      (error) => {
        streamError = error
      },
      { signal: controller.signal }
    )
    if (streamError) throw streamError
    if (historyRef.value?.refresh) await historyRef.value.refresh()
    transientMessages.value = []
  } catch (e) {
    inputText.value = text
    transientMessages.value = []
    if (!controller.signal.aborted) sendError.value = e.message || '发送失败'
  } finally {
    activeRequest.value = null
    sending.value = false
  }
}

function cancelSend() {
  activeRequest.value?.abort()
}

function handleConfirmResolved() {
  if (historyRef.value?.refresh) historyRef.value.refresh()
}
</script>

<template>
  <div class="chat-panel">
    <ChatDateNav
      :days="days"
      :selected="selectedDate"
      :loading="daysLoading"
      @select="selectedDate = $event"
      @prev="
        () => {
          const i = days.findIndex((d) => d.date === selectedDate)
          if (i > 0) selectedDate = days[i - 1].date
        }
      "
      @next="
        () => {
          const i = days.findIndex((d) => d.date === selectedDate)
          if (i < days.length - 1) selectedDate = days[i + 1].date
        }
      "
    />
    <ChatHistoryPage
      ref="historyRef"
      :date="selectedDate"
      :transient-messages="transientMessages"
      @confirm-resolved="handleConfirmResolved"
    />
    <div class="chat-panel-footer">
      <div v-if="sendError" class="chat-panel-error">{{ sendError }}</div>
      <div class="chat-panel-input-row">
        <textarea
          v-model="inputText"
          class="chat-panel-input"
          placeholder="输入消息..."
          :disabled="sending"
          rows="2"
          @keydown.enter.exact="handleSend"
        />
        <Button class="chat-panel-send" size="icon" :disabled="sending || !inputText.trim()" @click="handleSend">
          <Loader2 v-if="sending" :size="16" class="spin" />
          <Send v-else :size="16" />
        </Button>
        <Button v-if="sending" class="chat-panel-cancel" size="icon" variant="neutral" @click="cancelSend">
          <X :size="16" />
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f0f0f0;
}

.chat-panel-footer {
  padding: 0.75rem;
  border-top: 2px solid var(--nb-border);
  background: #fff;
}

.chat-panel-error {
  font-size: 0.7rem;
  color: var(--nb-danger, #d32f2f);
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.chat-panel-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.chat-panel-input {
  flex: 1;
}

.chat-panel-send {
  flex-shrink: 0;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
