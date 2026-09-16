<script setup>
import { ref, watch } from 'vue'
import { MessagesSquare } from '@lucide/vue'
import MessageRow from './MessageRow.vue'
import EmptyState from '../common/EmptyState.vue'
import { getChatDay } from '../../api/chatlog.js'

const props = defineProps({
  date: { type: String, required: true },
})

const messages = ref([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await getChatDay(props.date)
    messages.value = res.messages || []
  } catch (e) {
    error.value = e.message || '加载失败'
    messages.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.date, load, { immediate: true })

defineExpose({ refresh: load })
</script>

<template>
  <div class="chat-history">
    <div v-if="loading" class="chat-history-loading">
      <div class="chat-history-skeleton" v-for="n in 3" :key="n">
        <div class="skeleton-avatar" />
        <div class="skeleton-bubble" />
      </div>
    </div>
    <div v-else-if="error" class="chat-history-error">
      <span>{{ error }}</span>
      <button class="chat-history-retry" @click="load">重试</button>
    </div>
    <EmptyState v-else-if="messages.length === 0" :icon="MessagesSquare" text="暂无消息" />
    <div v-else class="chat-history-messages">
      <MessageRow
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-history {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
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
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
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