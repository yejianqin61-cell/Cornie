<script setup>
import { onMounted, ref } from 'vue'
import { getChatlog } from '../api'

const props = defineProps({
  date: { type: String, required: true }
})

const emit = defineEmits(['back'])
const messages = ref([])
const loading = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await getChatlog(props.date)
    messages.value = data.messages || []
  } catch (error) {
    errorMsg.value = error?.message || '加载聊天记录失败，请稍后再试。'
  } finally {
    loading.value = false
  }
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
      <button class="ghost" @click="goBack">← 返回聊天记录</button>
      <div class="dayDate">{{ formatDateLabel(date) }}</div>
      <div class="dayHint" v-if="!loading">{{ messages.length }} 条消息</div>
    </header>

    <div v-if="errorMsg" class="dayError">{{ errorMsg }}</div>

    <div v-if="loading" class="dayLoading">加载中…</div>

    <div v-else-if="messages.length === 0" class="dayEmpty">
      这一天还没有聊天记录。
    </div>

    <div v-else class="dayMessages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="dayBubble"
        :class="msg.role === 'user' ? 'dayBubbleUser' : 'dayBubbleCornie'"
      >
        <div class="dayRole">{{ msg.role === 'user' ? '你' : '铃湾' }}</div>
        <div class="dayText">{{ msg.content }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dayView{
  height: 100%;
  display:flex;
  flex-direction:column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
}

.dayHead{
  display:flex;
  align-items:center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}
.dayDate{
  font-size: 18px;
  font-weight: 800;
}
.dayHint{
  font-size: 12px;
  color: var(--muted);
  margin-left: auto;
}

.dayMessages{
  flex:1;
  overflow-y:auto;
  padding: 20px;
  display:flex;
  flex-direction:column;
  gap: 12px;
}
.dayMessages::-webkit-scrollbar{ width: 4px; }
.dayMessages::-webkit-scrollbar-thumb{
  background: rgba(0,0,0,.10);
  border-radius: 999px;
}

.dayBubble{
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 14px;
  line-height: 1.5;
  font-size: 14px;
}
.dayBubbleUser{
  align-self:flex-end;
  background: var(--accent);
  color: #FFFFFF;
  border-bottom-right-radius: 6px;
}
.dayBubbleCornie{
  align-self:flex-start;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-bottom-left-radius: 6px;
}

.dayRole{
  font-size: 11px;
  opacity: .6;
  margin-bottom: 3px;
}
.dayText{ white-space: pre-wrap; word-break: break-word; }

.dayLoading,
.dayEmpty,
.dayError{
  margin: 20px;
  padding: 12px;
  border-radius: 12px;
  text-align: center;
}
.dayLoading{ color: var(--muted); }
.dayEmpty{ border: 1px dashed var(--border); color: var(--muted); }
.dayError{
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
}
</style>
