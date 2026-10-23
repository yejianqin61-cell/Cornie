<script setup>
import { computed, ref, nextTick } from 'vue'
import { Send, Loader2, X } from '@lucide/vue'
import AppButton from '../common/AppButton.vue'
import ChatDateNav from './ChatDateNav.vue'
import ChatHistoryPage from './ChatHistoryPage.vue'
import { sendMessageStreamed } from '../../api/conversation.js'
import { listChatDays } from '../../api/chatlog.js'
import { singaporeDate } from '../../../../shared/local-date.js'

const inputText = ref('')
const sending = ref(false)
const sendError = ref('')
const notice = ref('')
const transientMessages = ref([])
const activeRequest = ref(null)
const inputEl = ref(null)

const MAX_MESSAGE_LENGTH = 5000

const days = ref([])
const selectedDate = ref('')
const daysLoading = ref(false)
const availableMonths = ref([])
const monthFilter = ref('')

const historyRef = ref(null)

function todayStr() {
  return singaporeDate()
}

function shiftDate(date, offset) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + offset)
  return value.toISOString().slice(0, 10)
}

function formatDayLabel(date, todayDate) {
  if (date === todayDate) return '今天'
  if (date === shiftDate(todayDate, -1)) return '昨天'
  const [year, month, day] = date.split('-').map(Number)
  if (String(year) === todayDate.slice(0, 4)) return `${month}月${day}日`
  return `${year}年${month}月${day}日`
}

async function loadDays() {
  daysLoading.value = true
  const previous = selectedDate.value
  const todayDate = todayStr()
  const currentMonth = todayDate.slice(0, 7)
  const includeToday = !monthFilter.value || monthFilter.value === currentMonth
  try {
    const res = await listChatDays(monthFilter.value ? { month: monthFilter.value } : {})
    availableMonths.value = res.availableMonths || []
    const dates = (res.entries || [])
      .map((entry) => entry.date)
      .filter(Boolean)
      .sort()
    if (includeToday && !dates.includes(todayDate)) dates.push(todayDate)
    dates.sort()
    days.value = dates.map((date) => ({ date, label: formatDayLabel(date, todayDate) }))
    const fallback = includeToday ? todayDate : dates[dates.length - 1]
    selectedDate.value = days.value.some((day) => day.date === previous) ? previous : fallback
    if (!dates.includes(selectedDate.value)) selectedDate.value = fallback
  } catch {
    days.value = [{ date: todayDate, label: '今天' }]
    selectedDate.value = todayDate
  } finally {
    daysLoading.value = false
  }
}

function selectMonth(month) {
  monthFilter.value = month
  loadDays()
}

async function goToday() {
  monthFilter.value = ''
  await loadDays()
  selectedDate.value = todayStr()
}

const selectedIndex = computed(() => days.value.findIndex((day) => day.date === selectedDate.value))
const prevDisabled = computed(() => daysLoading.value || selectedIndex.value <= 0)
const nextDisabled = computed(() => daysLoading.value || selectedIndex.value >= days.value.length - 1)

function goPrev() {
  if (prevDisabled.value) return
  selectedDate.value = days.value[selectedIndex.value - 1].date
}

function goNext() {
  if (nextDisabled.value) return
  selectedDate.value = days.value[selectedIndex.value + 1].date
}

loadDays()

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || sending.value) return
  if (text.length > MAX_MESSAGE_LENGTH) {
    sendError.value = `消息太长（上限 ${MAX_MESSAGE_LENGTH} 字）`
    return
  }
  const controller = new AbortController()
  sending.value = true
  sendError.value = ''
  inputText.value = ''
  activeRequest.value = controller
  const requestDate = selectedDate.value
  transientMessages.value = [
    { id: `pending-user-${Date.now()}`, role: 'user', text, date: requestDate },
    { id: `pending-assistant-${Date.now()}`, role: 'assistant', text: '', date: requestDate },
  ]
  try {
    let streamError = null
    await sendMessageStreamed(
      { message: text, date: selectedDate.value },
      (delta) => {
        const assistant = transientMessages.value.at(-1)
        if (assistant) assistant.text += delta
      },
      (result) => {
        const assistant = transientMessages.value.at(-1)
        if (!assistant) return
        if (result?.pendingConfirmation) assistant.confirm = result.pendingConfirmation
        const results = result?.toolExecution?.results
        if (Array.isArray(results) && results.length > 0) assistant.toolResults = results
      },
      (error) => {
        streamError = error
      },
      { signal: controller.signal }
    )
    if (streamError) throw streamError
    notice.value = ''
    await loadDays()
    try {
      if (historyRef.value?.refresh) await historyRef.value.refresh({ bottom: true })
    } catch {
      notice.value = '历史刷新失败，稍后重试'
    }
    transientMessages.value = []
  } catch (e) {
    if (controller.signal.aborted) {
      transientMessages.value = []
      inputText.value = ''
      notice.value = '已取消'
      await loadDays()
      try {
        if (historyRef.value?.refresh) await historyRef.value.refresh({ bottom: true })
      } catch {
        notice.value = '已取消，历史刷新失败'
      }
    } else {
      const failedUser = transientMessages.value.find((message) => message.role === 'user')
      transientMessages.value = failedUser ? [{ ...failedUser, status: 'failed' }] : []
      inputText.value = text
      sendError.value = e.message || '发送失败'
    }
  } finally {
    activeRequest.value = null
    sending.value = false
    nextTick(syncInputHeight)
  }
}

function handleRetry(message) {
  const text = typeof message === 'string' ? message : message?.text
  if (!text || sending.value) return
  sendError.value = ''
  transientMessages.value = []
  inputText.value = text
  handleSend()
}

function syncInputHeight() {
  const el = inputEl.value
  if (!el) return
  if (!inputText.value) {
    el.style.height = ''
    return
  }
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight || 0, 144)}px`
}

function onInputKeydown(event) {
  if (event.key !== 'Enter') return
  if (event.isComposing || event.keyCode === 229) return
  if (event.shiftKey) return
  event.preventDefault()
  handleSend()
}

function cancelSend() {
  activeRequest.value?.abort()
}

function handleConfirmResolved() {
  if (historyRef.value?.refresh) historyRef.value.refresh({ bottom: true })
}
</script>

<template>
  <div class="chat-panel">
    <ChatDateNav
      :days="days"
      :selected="selectedDate"
      :loading="daysLoading"
      :prev-disabled="prevDisabled"
      :next-disabled="nextDisabled"
      :months="availableMonths"
      :selected-month="monthFilter"
      :is-today="selectedDate === todayStr()"
      @select="selectedDate = $event"
      @prev="goPrev"
      @next="goNext"
      @month="selectMonth"
      @today="goToday"
    />
    <ChatHistoryPage
      ref="historyRef"
      :date="selectedDate"
      :transient-messages="transientMessages"
      @confirm-resolved="handleConfirmResolved"
      @retry="handleRetry"
    />
    <div class="chat-panel-footer">
      <div v-if="sendError" class="chat-panel-error">{{ sendError }}</div>
      <div v-if="notice" class="chat-panel-notice">{{ notice }}</div>
      <div class="chat-panel-input-row">
        <textarea
          ref="inputEl"
          v-model="inputText"
          class="chat-panel-input"
          placeholder="输入消息..."
          :maxlength="MAX_MESSAGE_LENGTH"
          rows="1"
          @input="syncInputHeight"
          @keydown="onInputKeydown"
        />
        <AppButton
          class="chat-panel-send"
          size="icon"
          aria-label="发送消息"
          :disabled="sending || !inputText.trim()"
          @click="handleSend"
        >
          <Loader2 v-if="sending" :size="16" class="spin" />
          <Send v-else :size="16" />
        </AppButton>
        <AppButton
          v-if="sending"
          class="chat-panel-cancel"
          size="icon"
          variant="neutral"
          aria-label="取消生成"
          @click="cancelSend"
        >
          <X :size="16" />
        </AppButton>
      </div>
      <div class="chat-panel-meta">
        <span class="chat-panel-hint">Enter 发送 · Shift+Enter 换行</span>
        <span v-if="inputText.length > MAX_MESSAGE_LENGTH * 0.9" class="chat-panel-count">
          {{ inputText.length }} / {{ MAX_MESSAGE_LENGTH }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--nb-background);
  border: var(--nb-border-width) solid var(--nb-border);
  box-shadow: var(--nb-shadow);
}

.chat-panel-footer {
  padding: 0.75rem;
  border-top: var(--nb-border-width) solid var(--nb-border);
  background: var(--nb-background);
}

.chat-panel-error {
  font-size: 0.75rem;
  color: var(--nb-danger);
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.chat-panel-notice {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nb-text-secondary);
  margin-bottom: 0.35rem;
}

.chat-panel-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.chat-panel-input {
  flex: 1;
  min-height: 2.75rem;
  max-height: 9rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-background);
  color: var(--nb-text);
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
}

.chat-panel-input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--nb-accent);
}

.chat-panel-send {
  flex-shrink: 0;
}

.chat-panel-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: var(--nb-text-secondary);
}

.chat-panel-count {
  font-weight: 700;
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
