<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useChat } from '../composables/useChat'
import ConfirmCard from './ConfirmCard.vue'
import AskBackBubble from './AskBackBubble.vue'
import ToolResultPanel from './ToolResultPanel.vue'

const {
  messages,
  sending,
  send,
  handleConfirmAction,
  restorePendingConfirmations,
  loadConversation,
  scrollChatToBottom
} = useChat()

const message = ref('')
const chatListRef = ref(null)

const todayDate = computed(() => {
  const d = new Date()
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekDay}`
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了，还没睡吗？'
  if (h < 12) return '早上好，今天是个新开始。'
  if (h < 14) return '中午好，记得吃午饭呀。'
  if (h < 18) return '下午好，今天过得怎么样？'
  return '晚上好，今天辛苦啦。'
})

const pendingCount = computed(() =>
  messages.value.filter((m) => m.kind === 'confirm' && m.status === 'pending').length
)

async function onSend() {
  const text = message.value.trim()
  if (!text || sending.value) return
  message.value = ''
  await send(text)
  await scrollChatToBottom(chatListRef)
}

function autoResize(e) {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

async function onConfirm(action, item) {
  await handleConfirmAction(action, item)
  await scrollChatToBottom(chatListRef)
}

onMounted(async () => {
  const date = new Date().toISOString().slice(0, 10)
  await loadConversation(date)
  await restorePendingConfirmations(date)
  await scrollChatToBottom(chatListRef)
})
</script>

<template>
  <div class="chatPage">
    <!-- 顶部陪伴区 -->
    <div class="chatCompanion">
      <div class="chatGreeting">{{ greeting }}</div>
      <div class="chatDate">{{ todayDate }}</div>
      <div class="chatTagline">想和我聊点什么？我在听。</div>
    </div>

    <!-- 主对话区 -->
    <div class="chatMessages" ref="chatListRef">
      <div v-if="messages.length === 0 && !sending" class="chatEmpty">
        <div class="chatEmptyIcon">💬</div>
        <div class="chatEmptyTitle">还没有消息</div>
        <div class="chatEmptyHint">给铃湾发一条消息吧</div>
      </div>

      <div v-else class="chatList">
        <div
          v-for="m in messages"
          :key="m.id"
          class="chatItem"
          :class="[
            m.kind === 'message' && m.role === 'user' ? 'chatItemUser' : 'chatItemCornie',
          ]"
        >
          <template v-if="m.kind === 'message'">
            <div class="bubble" :class="m.role === 'user' ? 'bubbleUser' : 'bubbleCornie'">
              <div class="bubbleRole">{{ m.role === 'user' ? '你' : '铃湾' }}</div>
              <div class="bubbleText">{{ m.content }}</div>
            </div>
          </template>

          <template v-else-if="m.kind === 'tool_result'">
            <ToolResultPanel :results="m.results" />
          </template>

          <template v-else-if="m.kind === 'confirm'">
            <ConfirmCard
              :request="m.request"
              :status="m.status || 'pending'"
              :error-message="m.errorMessage || ''"
              @confirm="onConfirm('confirm', m)"
              @reject="onConfirm('reject', m)"
            />
          </template>

          <template v-else-if="m.kind === 'ask_back'">
            <AskBackBubble :question="m.question" :reason="m.reason" />
          </template>

          <template v-else-if="m.kind === 'error'">
            <div class="bubble bubbleError">
              <div class="bubbleRole">系统提示</div>
              <div class="bubbleText">{{ m.content }}</div>
            </div>
          </template>
        </div>

        <div v-if="sending" class="bubble bubbleCornie">
          <div class="bubbleRole">铃湾</div>
          <div class="bubbleText thinking">正在思考...</div>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="chatInputBar">
      <textarea
        v-model="message"
        class="chatTextarea"
        placeholder="和铃湾说句话..."
        rows="1"
        @keydown.enter.exact.prevent="onSend"
        @input="autoResize"
      />
      <button
        class="primary chatSendBtn"
        :disabled="!message.trim() || sending"
        @click="onSend"
      >
        发送
      </button>
    </div>

    <!-- 待确认提示 -->
    <div v-if="pendingCount > 0" class="chatPendingHint">
      有 {{ pendingCount }} 条待确认事项，请在上面处理。
    </div>
  </div>
</template>

<style scoped>
.chatPage{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--chat-tint);
  border-radius: 18px;
  border: 1px solid var(--border);
  overflow: hidden;
}

/* ─── 顶部陪伴区 ─── */
.chatCompanion{
  padding: 20px 24px 16px;
  text-align: center;
  border-bottom: 1px solid var(--border);
}
.chatGreeting{
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
}
.chatDate{
  margin-top: 4px;
  font-size: 13px;
  color: var(--muted);
}
.chatTagline{
  margin-top: 8px;
  font-size: 14px;
  color: var(--muted);
}

/* ─── 主对话区 ─── */
.chatMessages{
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  scroll-behavior: smooth;
}
.chatMessages::-webkit-scrollbar{ width: 4px; }
.chatMessages::-webkit-scrollbar-thumb{
  background: rgba(0,0,0,.10);
  border-radius: 999px;
}

.chatEmpty{
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted);
}
.chatEmptyIcon{ font-size: 40px; }
.chatEmptyTitle{ font-size: 16px; font-weight: 600; color: var(--text); }
.chatEmptyHint{ font-size: 13px; }

.chatList{
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chatItem{ width: 100%; display: flex; }
.chatItemUser{ justify-content: flex-end; }
.chatItemCornie{ justify-content: flex-start; }

/* ─── 气泡 ─── */
.bubble{
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
}
.bubbleUser{
  background: var(--accent);
  color: #FFFFFF;
  border-bottom-right-radius: 6px;
}
.bubbleCornie{
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  border-bottom-left-radius: 6px;
}
.bubbleError{
  max-width: 100%;
  background: rgba(217,106,92,.08);
  border: 1px solid rgba(217,106,92,.20);
  color: var(--danger);
}
.bubbleRole{
  font-size: 11px;
  opacity: .6;
  margin-bottom: 3px;
}
.bubbleText{
  white-space: pre-wrap;
  word-break: break-word;
}
.bubbleText.thinking{
  font-style: italic;
  opacity: .6;
}

/* ─── 输入区 ─── */
.chatInputBar{
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}
.chatTextarea{
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  resize: none;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  outline: none;
}
.chatTextarea:focus{
  border-color: var(--accent);
}
.chatTextarea::placeholder{
  color: var(--muted);
}
.chatSendBtn{
  flex: 0 0 auto;
  padding: 10px 20px;
  border-radius: 12px;
  white-space: nowrap;
}

/* ─── 待确认提示 ─── */
.chatPendingHint{
  padding: 8px 20px;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
  background: var(--surface);
  border-top: 1px solid var(--border);
}
</style>
