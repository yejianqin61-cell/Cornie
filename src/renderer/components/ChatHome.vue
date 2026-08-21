<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useChat } from '../composables/useChat'
import { today } from '../utils/date'
import ConfirmCard from './ConfirmCard.vue'
import AskBackBubble from './AskBackBubble.vue'
import ToolResultPanel from './ToolResultPanel.vue'

const {
  messages,
  sending,
  send: sendFallback,
  streamSend,
  handleConfirmAction,
  restorePendingConfirmations,
  loadConversation,
  startConversationSync,
  stopConversationSync
} = useChat()

const message = ref('')
const chatListRef = ref(null)
const isPinnedToBottom = ref(true)
const hasUnreadBelow = ref(false)
const hasInitializedScroll = ref(false)
const autoStickThreshold = 36

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

defineEmits(['go-history'])

function getDistanceFromBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight
}

function isNearBottom(el) {
  return getDistanceFromBottom(el) <= autoStickThreshold
}

function updatePinnedState() {
  const el = chatListRef.value
  if (!el) return
  const pinned = isNearBottom(el)
  isPinnedToBottom.value = pinned
  if (pinned) {
    hasUnreadBelow.value = false
  }
}

function handleChatScroll() {
  updatePinnedState()
}

async function scrollToBottom(force = false) {
  await nextTick()
  const el = chatListRef.value
  if (!el) return
  if (!force && !isPinnedToBottom.value) {
    hasUnreadBelow.value = true
    return
  }
  el.scrollTop = el.scrollHeight
  isPinnedToBottom.value = true
  hasUnreadBelow.value = false
}

async function onSend() {
  const text = message.value.trim()
  if (!text || sending.value) return
  message.value = ''
  // FE-03：主聊天入口默认流式；非流式 send 保留为回退（sendFallback，当前未被 UI 使用）。
  await streamSend(text)
  await scrollToBottom()
}

function autoResize(e) {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

async function onConfirm(action, item) {
  await handleConfirmAction(action, item)
  await scrollToBottom()
}

async function jumpToBottom() {
  await scrollToBottom(true)
}

onMounted(async () => {
  const date = today()
  await loadConversation(date)
  await restorePendingConfirmations(date)
  await scrollToBottom(true)
  hasInitializedScroll.value = true
  startConversationSync(date, {
    onAfterSync: async () => {
      await scrollToBottom()
    }
  })
})

onBeforeUnmount(() => {
  stopConversationSync()
})

watch(
  () => messages.value.length,
  async (current, previous) => {
    if (!hasInitializedScroll.value || current <= previous) return
    await scrollToBottom()
  }
)
</script>

<template>
  <div class="chatPage">
    <!-- 顶部陪伴区 -->
    <div class="chatCompanion">
      <span class="chatGreeting">{{ greeting }}</span>
      <span class="chatDate">{{ todayDate }}</span>
      <button class="ghost chatHistoryBtn" type="button" @click="$emit('go-history')">翻看以前聊天</button>
      <span class="chatTagline">想和我聊点什么？</span>
    </div>

    <!-- 主对话区 -->
    <div class="chatMessages" ref="chatListRef" @scroll="handleChatScroll">
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

      <button
        v-if="hasUnreadBelow"
        class="chatJumpBottom"
        type="button"
        @click="jumpToBottom"
      >
        回到底部
      </button>
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
  background: var(--surface);
  border-radius: 16px;
  border: 1px solid var(--border);
  overflow: hidden;
}

/* ─── 顶部陪伴区（压缩为一行） ─── */
.chatCompanion{
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--chat-tint);
  flex: 0 0 auto;
}
.chatGreeting{
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
}
.chatDate{
  font-size: 12px;
  color: var(--muted);
}
.chatHistoryBtn{
  padding: 6px 10px;
  margin-left: 6px;
}
.chatTagline{
  margin-left: auto;
  font-size: 12px;
  color: var(--muted);
}

/* ─── 主对话区 ─── */
.chatMessages{
  flex: 1;
  overflow-y: auto;
  padding: 14px 20px;
  scroll-behavior: smooth;
  position: relative;
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
.chatEmptyIcon{ font-size: 36px; }
.chatEmptyTitle{ font-size: 15px; font-weight: 600; color: var(--text); }
.chatEmptyHint{ font-size: 13px; }

.chatList{
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chatItem{ width: 100%; display: flex; }
.chatItemUser{ justify-content: flex-end; }
.chatItemCornie{ justify-content: flex-start; }

/* ─── 气泡 ─── */
.bubble{
  max-width: 75%;
  padding: 8px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
}
.bubbleUser{
  background: var(--accent);
  color: #FFFFFF;
  border-bottom-right-radius: 6px;
}
.bubbleCornie{
  background: var(--surface-2);
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
  margin-bottom: 2px;
}
.bubbleText{
  white-space: pre-wrap;
  word-break: break-word;
}
.bubbleText.thinking{
  font-style: italic;
  opacity: .6;
}

.chatJumpBottom{
  position: sticky;
  left: 100%;
  bottom: 10px;
  margin-top: 12px;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 999px;
  background: rgba(255,255,255,.92);
  color: var(--text);
  font-size: 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,.08);
  backdrop-filter: blur(6px);
}

.chatJumpBottom:hover{
  background: #fff;
}

/* ─── 输入区 ─── */
.chatInputBar{
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}
.chatTextarea{
  flex: 1;
  min-height: 36px;
  max-height: 120px;
  resize: none;
  border-radius: 12px;
  padding: 8px 14px;
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
  padding: 8px 18px;
  border-radius: 10px;
  white-space: nowrap;
  font-size: 14px;
}

/* ─── 待确认提示 ─── */
.chatPendingHint{
  padding: 6px 20px;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
  background: var(--chat-tint);
  border-top: 1px solid var(--border);
}
</style>
