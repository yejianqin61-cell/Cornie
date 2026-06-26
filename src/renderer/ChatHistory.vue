<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getChatlog, listChatlogDates } from './api'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toISOMonth(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const today = new Date()
const selectedMonth = ref(toISOMonth(today))
const selectedDate = ref(toISODate(today))
const entries = ref([])
const messages = ref([])
const loadingDates = ref(false)
const loadingMessages = ref(false)
const errorMsg = ref('')

const selectedLabel = computed(() => selectedDate.value)

async function refreshDates() {
  loadingDates.value = true
  errorMsg.value = ''
  try {
    const data = await listChatlogDates({ month: selectedMonth.value })
    entries.value = data.entries || []
    if (!entries.value.find((item) => item.date === selectedDate.value) && entries.value.length > 0) {
      selectedDate.value = entries.value[0].date
    }
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    loadingDates.value = false
  }
}

async function refreshMessages(date) {
  loadingMessages.value = true
  errorMsg.value = ''
  try {
    const data = await getChatlog(date)
    messages.value = data.messages || []
  } catch (error) {
    errorMsg.value = error?.message || String(error)
    messages.value = []
  } finally {
    loadingMessages.value = false
  }
}

function pickDate(date) {
  selectedDate.value = date
}

watch(selectedMonth, async () => {
  await refreshDates()
})

watch(selectedDate, async (date) => {
  await refreshMessages(date)
})

onMounted(async () => {
  await refreshDates()
  await refreshMessages(selectedDate.value)
})
</script>

<template>
  <div class="history">
    <aside class="historySidebar">
      <div class="historyHead">
        <div class="historyTitle">聊天历史</div>
        <input v-model="selectedMonth" class="monthInput" type="month" />
      </div>

      <div class="historyList">
        <button
          v-for="item in entries"
          :key="item.date"
          class="historyRow"
          :class="{ active: item.date === selectedDate }"
          @click="pickDate(item.date)"
        >
          <span>{{ item.date }}</span>
          <span class="historyCount">{{ item.messageCount }}</span>
        </button>
      </div>
    </aside>

    <section class="historyContent">
      <div class="historyContentHead">
        <div>
          <div class="historyTitle">{{ selectedLabel }}</div>
          <div class="historyHint">
            {{ loadingDates || loadingMessages ? '加载中…' : `${messages.length} 条消息` }}
          </div>
        </div>
      </div>

      <div v-if="errorMsg" class="historyError">{{ errorMsg }}</div>

      <div v-if="messages.length === 0 && !loadingMessages" class="historyEmpty">
        这一天还没有聊天记录。
      </div>

      <div v-else class="historyMessages">
        <div
          v-for="message in messages"
          :key="message.id"
          class="historyBubble"
          :class="message.role === 'user' ? 'historyBubbleUser' : 'historyBubbleCornie'"
        >
          <div class="historyRole">{{ message.role === 'user' ? '主人' : '铃湾' }}</div>
          <div class="historyText">{{ message.content }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.history{
  display:grid;
  grid-template-columns: 240px 1fr;
  gap: 14px;
  min-height: 0;
}

.historySidebar,
.historyContent{
  border: 1px solid var(--border);
  border-radius: 18px;
  background: rgba(255,255,255,.04);
  overflow: hidden;
}

.historyHead,
.historyContentHead{
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.historyTitle{
  font-weight: 700;
}

.historyHint{
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.monthInput{
  margin-top: 10px;
  width: 100%;
}

.historyList{
  display:flex;
  flex-direction:column;
  gap: 8px;
  padding: 10px;
  overflow:auto;
}

.historyRow{
  display:flex;
  justify-content: space-between;
  align-items:center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  text-align:left;
}

.historyRow.active{
  border-color: rgba(125,211,252,.35);
  background: rgba(125,211,252,.10);
}

.historyCount{
  font-size: 12px;
  color: var(--muted);
}

.historyContent{
  display:flex;
  flex-direction:column;
  min-height: 0;
}

.historyMessages{
  display:flex;
  flex-direction:column;
  gap: 10px;
  padding: 16px;
  overflow:auto;
}

.historyBubble{
  max-width: 85%;
  padding: 10px 12px;
  border-radius: 14px;
  line-height: 1.5;
}

.historyBubbleUser{
  align-self:flex-end;
  background: rgba(125,211,252,.14);
  border: 1px solid rgba(125,211,252,.28);
}

.historyBubbleCornie{
  align-self:flex-start;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
}

.historyRole{
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 4px;
}

.historyText{
  white-space: pre-wrap;
  word-break: break-word;
}

.historyEmpty,
.historyError{
  margin: 16px;
  padding: 12px;
  border-radius: 12px;
}

.historyEmpty{
  border: 1px dashed var(--border);
  color: var(--muted);
}

.historyError{
  border: 1px solid rgba(248,113,113,.35);
  background: rgba(248,113,113,.08);
  color: rgba(254,226,226,.95);
}

@media (max-width: 980px){
  .history{
    grid-template-columns: 1fr;
  }
}
</style>
