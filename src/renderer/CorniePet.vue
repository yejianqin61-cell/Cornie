<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useChat } from './composables/useChat'
import { today } from './utils/date'

const hover = ref(false)
const pinned = ref(false)
const focused = ref(false)
const alwaysOnTop = ref(false)
const message = ref('')
const dragReady = ref(false)
const chatListRef = ref(null)

const {
  messages,
  sending,
  send: sendChat,
  loadConversation,
  restorePendingConfirmations,
  startConversationSync,
  stopConversationSync,
} = useChat()

const displayMessages = computed(() => messages.value.filter((item) => item.kind === 'message'))
const pendingCount = computed(
  () => messages.value.filter((item) => item.kind === 'confirm' && item.status === 'pending').length
)
const latestAskBack = computed(() => [...messages.value].reverse().find((item) => item.kind === 'ask_back') || null)
const latestError = computed(() => [...messages.value].reverse().find((item) => item.kind === 'error') || null)
const latestNotice = computed(() => {
  if (pendingCount.value > 0) {
    return {
      type: 'confirm',
      text: `有 ${pendingCount.value} 件事，小铃湾想先和主人确认一下。`,
      actionLabel: '去主窗口',
    }
  }
  if (latestAskBack.value?.question) {
    return {
      type: 'ask_back',
      text: latestAskBack.value.question,
      actionLabel: '',
    }
  }
  if (latestError.value?.content) {
    return {
      type: 'error',
      text: latestError.value.content,
      actionLabel: '',
    }
  }
  return null
})

const mood = computed(() => {
  if (sending.value) return '( •_• )'
  if (focused.value) return '( •ᴗ• )'
  if (hover.value || pinned.value) return '(•‿•)'
  return '( ᴗ ᴗ )'
})

const petStateClass = computed(() => {
  if (sending.value) return 'is-thinking'
  if (focused.value) return 'is-focus'
  if (hover.value || pinned.value) return 'is-hover'
  return 'is-idle'
})

const isExpanded = computed(() => hover.value || pinned.value || focused.value)

function onEnter() {
  hover.value = true
}

function onLeave() {
  hover.value = false
  if (!pinned.value && !focused.value) {
    scrollToLatest()
  }
}

function onFocusIn() {
  focused.value = true
}

function onFocusOut(event) {
  const nextTarget = event?.relatedTarget
  if (nextTarget && event.currentTarget?.contains?.(nextTarget)) return
  focused.value = false
}

function togglePinned() {
  pinned.value = !pinned.value
}

async function toggleAlwaysOnTop() {
  try {
    const nextValue = await window.cornieDesktop?.setAlwaysOnTop?.(!alwaysOnTop.value)
    alwaysOnTop.value = Boolean(nextValue)
  } catch {
    alwaysOnTop.value = !alwaysOnTop.value
  }
}

function openMainWindow() {
  try {
    window.cornieDesktop?.showMainWindow?.()
  } catch {
    // ignore
  }
}

let windowDrag = null

function canWindowDrag(target) {
  if (typeof window === 'undefined' || !window.cornieDesktop) return false
  const interactive = target?.closest?.('button, input')
  return !interactive
}

function onDragPointerDown(e) {
  if (!canWindowDrag(e.target)) return
  if (e.button !== undefined && e.button !== 0) return
  windowDrag = { pointerId: e.pointerId }
  try {
    e.currentTarget.setPointerCapture?.(e.pointerId)
  } catch {}
  window.cornieDesktop.dragStart({ screenX: e.screenX, screenY: e.screenY })
}

function onDragPointerMove(e) {
  if (!windowDrag || !window.cornieDesktop) return
  window.cornieDesktop.dragMove({ screenX: e.screenX, screenY: e.screenY })
}

function onDragPointerUp() {
  if (!windowDrag) return
  windowDrag = null
  try {
    window.cornieDesktop.dragEnd()
  } catch {}
}

async function scrollToLatest() {
  await nextTick()
  if (!chatListRef.value) return
  chatListRef.value.scrollTop = chatListRef.value.scrollHeight
}

async function send() {
  const text = message.value.trim()
  if (!text || sending.value) return

  message.value = ''
  focused.value = true
  pinned.value = true

  await sendChat(text)
  await scrollToLatest()
}

watch(
  () => displayMessages.value.length,
  async () => {
    await scrollToLatest()
  }
)

onMounted(async () => {
  dragReady.value = typeof window !== 'undefined' && Boolean(window.cornieDesktop)
  try {
    alwaysOnTop.value = Boolean(await window.cornieDesktop?.getAlwaysOnTop?.())
  } catch {
    alwaysOnTop.value = false
  }
  const date = today()
  await loadConversation(date)
  await restorePendingConfirmations(date)
  await scrollToLatest()
  startConversationSync(date, {
    onAfterSync: async () => {
      await scrollToLatest()
    },
  })
})

onBeforeUnmount(() => {
  stopConversationSync()
})
</script>

<template>
  <div class="petRoot">
    <div
      class="petShell"
      :class="[petStateClass, { 'is-expanded': isExpanded, 'is-draggable': dragReady }]"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
      @focusin="onFocusIn"
      @focusout="onFocusOut"
      @pointerdown="onDragPointerDown"
      @pointermove="onDragPointerMove"
      @pointerup="onDragPointerUp"
      @pointercancel="onDragPointerUp"
    >
      <section v-if="isExpanded" class="petPanel">
        <div class="petPanelAura"></div>

        <div ref="chatListRef" class="petMessages">
          <div v-if="displayMessages.length === 0 && !sending" class="petEmpty">
            <div class="petEmptyTitle">小铃湾在这里</div>
            <div class="petEmptyHint">把今天想说的话，轻轻放过来吧。</div>
          </div>

          <template v-else>
            <div
              v-for="item in displayMessages"
              :key="item.id"
              class="petMessageRow"
              :class="item.role === 'user' ? 'is-user' : 'is-cornie'"
            >
              <div class="petMessageBubble" :class="item.role === 'user' ? 'is-user' : 'is-cornie'">
                <div class="petMessageRole">{{ item.role === 'user' ? '主人' : '小铃湾' }}</div>
                <div class="petMessageText">{{ item.content }}</div>
              </div>
            </div>

            <div v-if="sending" class="petMessageRow is-cornie">
              <div class="petMessageBubble is-cornie">
                <div class="petMessageRole">小铃湾</div>
                <div class="petMessageText is-thinking">正在想你说的话……</div>
              </div>
            </div>
          </template>
        </div>

        <div v-if="latestNotice" class="petNotice" :class="`is-${latestNotice.type}`">
          <div class="petNoticeText">{{ latestNotice.text }}</div>
          <button v-if="latestNotice.actionLabel" type="button" class="petNoticeAction" @click="openMainWindow">
            {{ latestNotice.actionLabel }}
          </button>
        </div>

        <div class="petInputBar">
          <input
            v-model="message"
            class="petInput"
            type="text"
            placeholder="和小铃湾说句话……"
            @keydown.enter.prevent="send"
          />
          <button
            type="button"
            class="petTopButton"
            :class="{ 'is-on': alwaysOnTop }"
            :title="alwaysOnTop ? '取消置于上方' : '置于所有页面上方'"
            @click="toggleAlwaysOnTop"
          >
            {{ alwaysOnTop ? '顶' : '浮' }}
          </button>
          <button
            type="button"
            class="petPinButton"
            :class="{ 'is-on': pinned }"
            :title="pinned ? '取消停留' : '让她多陪一会儿'"
            @click="togglePinned"
          >
            {{ pinned ? '停' : '留' }}
          </button>
          <button type="button" class="petSendButton" :disabled="!message.trim() || sending" @click="send">说</button>
        </div>
      </section>

      <button type="button" class="petFace" :class="{ 'is-active': isExpanded }" @click="pinned = !pinned">
        <span class="petFaceGlow"></span>
        <span class="petFaceText">{{ mood }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.petRoot {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  padding: 12px;
  background: transparent;
  overflow: hidden;
  -webkit-app-region: no-drag;
}

.petShell {
  position: relative;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  cursor: default;
  user-select: none;
}

.petShell.is-draggable {
  cursor: grab;
}

.petShell.is-draggable:active {
  cursor: grabbing;
}

.petPanel {
  position: relative;
  width: min(320px, calc(100vw - 24px));
  padding: 14px 14px 12px;
  border-radius: 24px;
  background: var(--pet-bg);
  border: 1px solid var(--pet-border);
  box-shadow: var(--pet-shadow-soft);
  backdrop-filter: blur(10px);
  -webkit-app-region: no-drag;
  animation: petPanelIn var(--pet-transition-base);
  overflow: hidden;
}

.petPanelAura {
  position: absolute;
  inset: auto -12px -28px auto;
  width: 124px;
  height: 124px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(247, 216, 202, 0.72) 0%, rgba(247, 216, 202, 0) 70%);
  pointer-events: none;
}

.petMessages {
  position: relative;
  z-index: 1;
  max-height: 136px;
  min-height: 88px;
  overflow-y: auto;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.petMessages::-webkit-scrollbar {
  width: 4px;
}

.petMessages::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(161, 141, 128, 0.32);
}

.petEmpty {
  min-height: 88px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 8px 2px;
}

.petEmptyTitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--pet-text);
}

.petEmptyHint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--pet-text-soft);
}

.petMessageRow {
  display: flex;
  width: 100%;
}

.petMessageRow.is-user {
  justify-content: flex-end;
}

.petMessageRow.is-cornie {
  justify-content: flex-start;
}

.petMessageBubble {
  max-width: 82%;
  padding: 9px 12px 10px;
  border-radius: 18px;
  box-shadow: 0 6px 18px rgba(124, 93, 72, 0.06);
}

.petMessageBubble.is-user {
  background: var(--pet-user-bubble);
  color: var(--pet-text);
}

.petMessageBubble.is-cornie {
  background: var(--pet-cornie-bubble);
  color: var(--pet-text);
}

.petMessageRole {
  margin-bottom: 2px;
  font-size: 10px;
  color: var(--pet-text-faint);
}

.petMessageText {
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.petMessageText.is-thinking {
  color: var(--pet-text-soft);
  font-style: italic;
}

.petInputBar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.petNotice {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(196, 168, 146, 0.18);
  display: flex;
  align-items: center;
  gap: 10px;
}

.petNotice.is-confirm {
  background: rgba(247, 216, 202, 0.54);
}

.petNotice.is-error {
  background: rgba(246, 212, 208, 0.72);
}

.petNoticeText {
  flex: 1 1 auto;
  font-size: 12px;
  line-height: 1.5;
  color: var(--pet-text-soft);
}

.petNoticeAction {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(196, 168, 146, 0.16);
  background: rgba(255, 255, 255, 0.84);
  color: var(--pet-text);
  font-size: 12px;
}

.petInput {
  flex: 1 1 auto;
  min-width: 0;
  height: 38px;
  border-radius: 999px;
  background: var(--pet-input-bg);
  border: 1px solid rgba(196, 168, 146, 0.18);
  color: var(--pet-text);
  font-size: 13px;
  padding: 0 14px;
}

.petInput:focus {
  outline: none;
  border-color: rgba(223, 141, 112, 0.38);
  box-shadow: 0 0 0 4px rgba(239, 179, 154, 0.16);
}

.petInput::placeholder {
  color: var(--pet-text-faint);
}

.petTopButton,
.petPinButton,
.petSendButton {
  flex: 0 0 auto;
  height: 36px;
  min-width: 36px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid rgba(196, 168, 146, 0.18);
  background: var(--pet-surface);
  color: var(--pet-text-soft);
  -webkit-app-region: no-drag;
}

.petTopButton:hover,
.petPinButton:hover,
.petSendButton:hover {
  background: rgba(255, 255, 255, 0.88);
}

.petTopButton.is-on,
.petPinButton.is-on {
  background: var(--pet-accent-soft);
  color: var(--pet-accent-strong);
}

.petSendButton {
  background: var(--pet-accent);
  color: #fffaf5;
  border-color: transparent;
}

.petSendButton:hover {
  background: var(--pet-accent-strong);
}

.petSendButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.petFace {
  position: relative;
  min-width: 86px;
  height: 48px;
  padding: 0 16px;
  border-radius: 20px;
  border: 1px solid var(--pet-border);
  background: var(--pet-bg-soft);
  box-shadow: var(--pet-shadow-soft);
  color: var(--pet-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  -webkit-app-region: no-drag;
  animation: petBreath 3.8s ease-in-out infinite;
}

.petFace.is-active {
  box-shadow: var(--pet-shadow-hover);
}

.petFaceGlow {
  position: absolute;
  inset: auto auto -18px -10px;
  width: 92px;
  height: 92px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(239, 179, 154, 0.28) 0%, rgba(239, 179, 154, 0) 72%);
  pointer-events: none;
}

.petFaceText {
  position: relative;
  z-index: 1;
  font-size: 18px;
  line-height: 1;
  letter-spacing: 0.02em;
}

@keyframes petPanelIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes petBreath {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}
</style>
