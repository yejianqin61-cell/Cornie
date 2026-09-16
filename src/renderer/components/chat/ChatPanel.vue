<script setup>
import { ref, nextTick } from 'vue'
import { Send, Loader2 } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import ChatDateNav from './ChatDateNav.vue'
import ChatHistoryPage from './ChatHistoryPage.vue'
import { sendMessage } from '../../api/conversation.js'
import { listChatDays } from '../../api/chatlog.js'

const inputText = ref('')
const sending = ref(false)
const sendError = ref('')

const days = ref([])
const selectedDate = ref('')
const daysLoading = ref(false)

const historyRef = ref(null)

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

async function loadDays() {
  daysLoading.value = true
  try {
    const res = await listChatDays()
    days.value = (res.days || []).map(d => ({
      date: d,
      label: d === todayStr() ? '今天' : d.slice(5),
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
  sending.value = true
  sendError.value = ''
  inputText.value = ''
  try {
    await sendMessage({ message: text, date: selectedDate.value })
    if (historyRef.value?.refresh) await historyRef.value.refresh()
  } catch (e) {
    sendError.value = e.message || '发送失败'
  } finally {
    sending.value = false
  }
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
      @prev="() => { const i = days.findIndex(d => d.date === selectedDate); if (i > 0) selectedDate = days[i - 1].date }"
      @next="() => { const i = days.findIndex(d => d.date === selectedDate); if (i < days.length - 1) selectedDate = days[i + 1].date }"
    />
    <ChatHistoryPage
      ref="historyRef"
      :date="selectedDate"
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
        <Button
          class="chat-panel-send"
          size="icon"
          :disabled="sending || !inputText.trim()"
          @click="handleSend"
        >
          <Loader2 v-if="sending" :size="16" class="spin" />
          <Send v-else :size="16" />
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
  to { transform: rotate(360deg); }
}
</style>