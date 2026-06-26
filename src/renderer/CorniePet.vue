<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { cornieCssVars, cornieEyeOverlay, corniePetTransform, cornieStage } from './cornieConfig'
import { createCornieBlinkController } from './cornieBlink'
import { listConfirmations, sendMessage, submitConfirmationDecision } from './api'
import ToolResultPanel from './components/ToolResultPanel.vue'
import ConfirmCard from './components/ConfirmCard.vue'
import AskBackBubble from './components/AskBackBubble.vue'

const parts = [
  { id: 'tail1', label: '尾巴', src: '/pic/tail1-removebg-preview.png' },
  { id: 'body', label: '身体', src: '/pic/body-removebg-preview.png' },
  { id: 'head', label: '头', src: '/pic/head1-removebg-preview.png' },
  { id: 'ring', label: '铃铛', src: '/pic/ring-removebg-preview.png' }
]

const eyeHalfSrc = '/pic/halfclosedeye.png'
const eyeClosedSrc = '/pic/closedeye.png'

const stageStyle = computed(() => ({
  width: `${cornieStage.w}px`,
  height: `${cornieStage.h}px`,
  ...cornieCssVars
}))

const stageTransformStyle = computed(() => ({
  transform: `translate(${corniePetTransform.offsetX}px, ${corniePetTransform.offsetY}px) scale(${corniePetTransform.scale})`
}))

const headDipPx = ref(0)
const eyeLayer = ref('none')

const editing = ref(false)
const overlay = reactive({ ...cornieEyeOverlay })
const hover = ref(false)
const pinned = ref(false)
const message = ref('')
const dragReady = ref(false)
const showHitbox = ref(true)

const messages = ref([])
const sending = ref(false)
const chatListRef = ref(null)

function today() {
  return new Date().toISOString().slice(0, 10)
}

const overlayStyle = computed(() => ({
  left: `${overlay.x}px`,
  top: `${overlay.y}px`,
  width: `${overlay.w}px`,
  height: `${overlay.h}px`,
  transform: `rotate(${overlay.rot}deg)`,
  opacity: overlay.opacity
}))

function hideLayers() {
  eyeLayer.value = 'none'
}

function showLayer(name) {
  eyeLayer.value = name
}

function parseEditingFromUrl() {
  try {
    const u = new URL(window.location.href)
    return u.searchParams.get('edit') === '1'
  } catch {
    return false
  }
}

let blink = null

function parseHitboxFromUrl() {
  try {
    const u = new URL(window.location.href)
    const v = u.searchParams.get('hitbox')
    if (v === '0' || v === 'false') return false
    if (v === '1' || v === 'true') return true
  } catch {
    // ignore
  }
  return null
}

onMounted(() => {
  editing.value = parseEditingFromUrl()
  const hb = parseHitboxFromUrl()
  if (hb !== null) showHitbox.value = hb
  dragReady.value = typeof window !== 'undefined' && Boolean(window.cornieDesktop)

  blink = createCornieBlinkController({
    showLayer,
    hideLayers,
    setHeadDipPx: (px) => (headDipPx.value = px)
  })
  blink.start()

  window.addEventListener('keydown', onKeyDown)
  restorePendingConfirmations()
})

onBeforeUnmount(() => {
  blink?.stop?.()
  window.removeEventListener('keydown', onKeyDown)
})

function onKeyDown(e) {
  const k = e.key?.toLowerCase?.()
  const t = e.target
  if (t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement) return
  if (k === 'e') {
    editing.value = !editing.value
  } else if (k === 'b') {
    blink?.blinkNow?.()
  } else if (k === 'c') {
    copyConfig()
  } else if (k === 'h') {
    showHitbox.value = !showHitbox.value
  }
}

async function copyConfig() {
  const payload = {
    version: 1,
    eyeOverlay: { ...overlay }
  }
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
  } catch {
    // ignore
  }
}

let drag = null
let resize = null
let windowDrag = null

function onOverlayPointerDown(e) {
  if (!editing.value) return
  if (e.target?.classList?.contains?.('handle')) return
  e.stopPropagation()
  drag = {
    startX: e.clientX,
    startY: e.clientY,
    baseX: overlay.x,
    baseY: overlay.y
  }
  e.currentTarget.setPointerCapture?.(e.pointerId)
}

function onOverlayPointerMove(e) {
  if (!editing.value || !drag) return
  const dx = e.clientX - drag.startX
  const dy = e.clientY - drag.startY
  overlay.x = Math.round(drag.baseX + dx)
  overlay.y = Math.round(drag.baseY + dy)
}

function onOverlayPointerUp() {
  drag = null
  resize = null
}

function onHandleDown(e) {
  if (!editing.value) return
  e.stopPropagation()
  resize = {
    startX: e.clientX,
    startY: e.clientY,
    baseW: overlay.w,
    baseH: overlay.h
  }
  e.currentTarget.setPointerCapture?.(e.pointerId)
}

function onHandleMove(e) {
  if (!editing.value || !resize) return
  const dx = e.clientX - resize.startX
  const dy = e.clientY - resize.startY
  overlay.w = Math.max(10, Math.round(resize.baseW + dx))
  overlay.h = Math.max(10, Math.round(resize.baseH + dy))
}

function canWindowDrag() {
  return !editing.value && typeof window !== 'undefined' && window.cornieDesktop
}

function onDragPointerDown(e) {
  if (!canWindowDrag()) return
  if (e.button !== undefined && e.button !== 0) return
  windowDrag = { pointerId: e.pointerId }
  try {
    e.currentTarget.setPointerCapture?.(e.pointerId)
  } catch {}
  window.cornieDesktop.dragStart({ screenX: e.screenX, screenY: e.screenY })
}

function onDragPointerMove(e) {
  if (!windowDrag || !canWindowDrag()) return
  window.cornieDesktop.dragMove({ screenX: e.screenX, screenY: e.screenY })
}

function onDragPointerUp() {
  if (!windowDrag) return
  windowDrag = null
  try {
    window.cornieDesktop.dragEnd()
  } catch {}
}

function shouldShowChat() {
  if (editing.value) return false
  return true
}

function onEnter() {
  if (editing.value) return
  hover.value = true
}

function onLeave() {
  if (editing.value) return
  hover.value = false
}

function togglePinned() {
  pinned.value = !pinned.value
}

function pushChatItem(item) {
  messages.value.push({
    id: item.id || `${item.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...item
  })
}

function setConfirmMessageState(id, patch) {
  const target = messages.value.find((item) => item.id === id)
  if (!target) return
  Object.assign(target, patch)
}

function appendResponse(data) {
  if (data?.cornieMessage?.content) {
    pushChatItem({
      kind: 'message',
      role: 'cornie',
      content: data.cornieMessage.content,
      id: data.cornieMessage.id
    })
  }

  if (data?.toolExecution?.used && Array.isArray(data.toolExecution.results) && data.toolExecution.results.length > 0) {
    pushChatItem({
      kind: 'tool_result',
      results: data.toolExecution.results
    })
  }

  const decision = data?.policyDecision?.decision
  if (decision === 'confirm') {
    pushChatItem({
      kind: 'confirm',
      request: data.policyDecision.confirmRequest || {},
      pendingConfirmationId: data?.pendingConfirmation?.id || '',
      status: data?.pendingConfirmation?.status || 'pending',
      errorMessage: ''
    })
  } else if (decision === 'ask_back') {
    pushChatItem({
      kind: 'ask_back',
      question: data.policyDecision.question || '',
      reason: data.policyDecision.reason || ''
    })
  } else if (decision === 'deny') {
    pushChatItem({
      kind: 'error',
      content: data.policyDecision.reason || '这个动作现在不能执行。'
    })
  }
}

async function restorePendingConfirmations() {
  try {
    const data = await listConfirmations({ date: today(), status: 'pending' })
    for (const confirmation of data?.confirmations || []) {
      const exists = messages.value.some(
        (item) => item.kind === 'confirm' && item.pendingConfirmationId === confirmation.id
      )
      if (!exists) {
        pushChatItem({
          kind: 'confirm',
          request: confirmation.confirmRequest || {},
          pendingConfirmationId: confirmation.id,
          status: confirmation.status || 'pending',
          errorMessage: ''
        })
      }
    }
  } catch {
    // ignore restore failure
  }
}

async function handleConfirmAction(action, item) {
  if (!item?.pendingConfirmationId || item.status !== 'pending') return

  setConfirmMessageState(item.id, {
    status: 'processing',
    errorMessage: ''
  })
  scrollChatToBottom()

  try {
    const result = await submitConfirmationDecision(
      item.pendingConfirmationId,
      action === 'confirm' ? 'approve' : 'reject'
    )

    setConfirmMessageState(item.id, {
      status: result?.confirmation?.status || (action === 'confirm' ? 'approved' : 'rejected'),
      errorMessage: ''
    })

    if (
      result?.toolExecution?.used &&
      Array.isArray(result.toolExecution.results) &&
      result.toolExecution.results.length > 0
    ) {
      pushChatItem({
        kind: 'tool_result',
        results: result.toolExecution.results
      })
    }

    if (result?.cornieMessage?.content) {
      pushChatItem({
        kind: 'message',
        role: 'cornie',
        content: result.cornieMessage.content,
        id: result.cornieMessage.id
      })
    }
  } catch (error) {
    setConfirmMessageState(item.id, {
      status: 'failed',
      errorMessage: error?.message || '确认处理失败，请稍后再试。'
    })
  } finally {
    scrollChatToBottom()
  }
}

async function send() {
  const text = message.value.trim()
  if (!text || sending.value) return
  message.value = ''

  pushChatItem({ kind: 'message', role: 'user', content: text, id: Date.now().toString() })
  scrollChatToBottom()

  sending.value = true
  try {
    const data = await sendMessage(text, today())
    appendResponse(data)
  } catch {
    pushChatItem({
      kind: 'message',
      role: 'cornie',
      content: '唔...我好像走神了，能再说一遍吗？',
      id: 'err-' + Date.now(),
      error: true
    })
  } finally {
    sending.value = false
    scrollChatToBottom()
  }
}

async function scrollChatToBottom() {
  await nextTick()
  if (chatListRef.value) {
    chatListRef.value.scrollTop = chatListRef.value.scrollHeight
  }
}
</script>

<template>
  <div class="petRoot">
    <div
      class="hitbox"
      :class="{ ready: dragReady, editing, 'hitbox--debug': showHitbox }"
      @pointerdown="onDragPointerDown"
      @pointermove="onDragPointerMove"
      @pointerup="onDragPointerUp"
      @pointercancel="onDragPointerUp"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
    >
      <div class="hitboxPetArea">
        <div class="stageWrap" :style="stageTransformStyle">
          <div class="stage" :style="stageStyle">
            <div
              v-for="p in parts"
              :key="p.id"
              class="part"
              :class="[`p-${p.id}`, { headPart: p.id === 'head' }]"
              :aria-label="p.label"
              :style="
                p.id === 'head'
                  ? {
                      transform: `translate(var(--head-x), var(--head-y)) rotate(var(--head-r)) scale(var(--head-s)) translateY(${headDipPx}px)`
                    }
                  : null
              "
            >
              <img :src="p.src" :alt="p.label" draggable="false" />

              <div
                v-if="p.id === 'head'"
                class="eyeGroup"
                :class="{ editing }"
                :style="overlayStyle"
                @pointerdown="onOverlayPointerDown"
                @pointermove="onOverlayPointerMove"
                @pointerup="onOverlayPointerUp"
                @pointercancel="onOverlayPointerUp"
                @pointerleave="onOverlayPointerUp"
              >
                <div v-if="editing" class="outline"></div>
                <div v-if="editing" class="handle" @pointerdown="onHandleDown" @pointermove="onHandleMove" />

                <img v-show="eyeLayer === 'half'" class="eyeLayer" :src="eyeHalfSrc" alt="eye half" />
                <img v-show="eyeLayer === 'closed'" class="eyeLayer" :src="eyeClosedSrc" alt="eye closed" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="shouldShowChat() && messages.length > 0"
        ref="chatListRef"
        class="chatBubbles"
        @pointerdown.stop
        @pointermove.stop
        @pointerup.stop
      >
        <div
          v-for="m in messages"
          :key="m.id"
          class="chatItem"
          :class="[m.kind === 'message' && m.role === 'user' ? 'chatItemUser' : 'chatItemCornie']"
        >
          <template v-if="m.kind === 'message'">
            <div class="bubble" :class="m.role === 'user' ? 'bubbleUser' : 'bubbleCornie'">
              <div class="bubbleRole">{{ m.role === 'user' ? '主人' : 'Cornie' }}</div>
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
              @confirm="handleConfirmAction('confirm', m)"
              @reject="handleConfirmAction('reject', m)"
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
          <div class="bubbleRole">Cornie</div>
          <div class="bubbleText thinking">正在思考...</div>
        </div>
      </div>

      <div v-if="shouldShowChat()" class="chatBar" @pointerdown.stop @pointermove.stop @pointerup.stop>
        <input
          v-model="message"
          type="text"
          class="chatInputFlat"
          placeholder="和 Cornie 说句话..."
          @keydown.enter.prevent="send"
        />
        <button type="button" class="pinBtnSm" :class="{ on: pinned }" title="固定/解除" @click="togglePinned">
          {{ pinned ? '固' : '钉' }}
        </button>
        <button type="button" class="sendBtnSm" :disabled="!message.trim()" @click="send">发</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.petRoot{
  width: 100vw;
  height: 100vh;
  display: grid;
  justify-items: center;
  align-content: start;
  padding-top: 6px;
  padding-bottom: 10px;
  box-sizing: border-box;
  background: transparent;
  overflow: hidden;
  -webkit-app-region: no-drag;
}
.hitbox{
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
  max-width: 268px;
  padding: 12px;
  padding-top: 10px;
  padding-bottom: 12px;
  border-radius: 18px;
  -webkit-app-region: no-drag;
  cursor: grab;
}
.hitboxPetArea{
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  flex: 0 0 auto;
  padding-top: 2px;
}
.hitbox--debug{
  background: rgba(244, 114, 182, 0.14);
  outline: 1px dashed rgba(244, 114, 182, 0.75);
  outline-offset: 0;
  box-shadow: inset 0 0 0 1px rgba(244, 114, 182, 0.25);
}
.hitbox:active{ cursor: grabbing; }
.hitbox.editing{ cursor: default; }
.stageWrap{
  position: relative;
  overflow: visible;
  -webkit-app-region: no-drag;
}
.stage{
  position: relative;
  background: transparent;
  overflow: visible;
}
.part{
  position:absolute;
  left:0;
  top:0;
  transform-origin: 0 0;
}
.part img{
  display:block;
  max-width:none;
  pointer-events: none;
  user-select: none;
}
.p-tail1{
  z-index: var(--tail1-z);
  opacity: var(--tail1-o);
  transform: translate(var(--tail1-x), var(--tail1-y)) rotate(var(--tail1-r)) scale(var(--tail1-s));
}
.p-body{
  z-index: var(--body-z);
  opacity: var(--body-o);
  transform: translate(var(--body-x), var(--body-y)) rotate(var(--body-r)) scale(var(--body-s));
}
.p-head{
  z-index: var(--head-z);
  opacity: var(--head-o);
  transform: translate(var(--head-x), var(--head-y)) rotate(var(--head-r)) scale(var(--head-s));
}
.p-ring{
  z-index: var(--ring-z);
  opacity: var(--ring-o);
  transform: translate(var(--ring-x), var(--ring-y)) rotate(var(--ring-r)) scale(var(--ring-s));
}
.eyeGroup{
  position:absolute;
  pointer-events: none;
  -webkit-app-region: no-drag;
}
.eyeGroup.editing{
  pointer-events: auto;
  cursor: grab;
}
.eyeGroup.editing:active{
  cursor: grabbing;
}
.eyeLayer{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}
.outline{
  position:absolute;
  inset:0;
  border: 1px dashed rgba(125,211,252,.75);
  border-radius: 10px;
  background: rgba(125,211,252,.06);
}
.handle{
  position:absolute;
  width: 10px;
  height: 10px;
  right: -6px;
  bottom: -6px;
  border-radius: 999px;
  background: rgba(125,211,252,.95);
  border: 1px solid rgba(0,0,0,.35);
  cursor: nwse-resize;
}
.chatBubbles{
  width: 100%;
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 2px;
  -webkit-app-region: no-drag;
  scroll-behavior: smooth;
}
.chatBubbles::-webkit-scrollbar{ width: 4px; }
.chatBubbles::-webkit-scrollbar-thumb{ background: rgba(255,255,255,.15); border-radius: 999px; }
.chatItem{
  width: 100%;
  display: flex;
}
.chatItemUser{
  justify-content: flex-end;
}
.chatItemCornie{
  justify-content: flex-start;
}
.bubble{
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 12px;
  line-height: 1.5;
}
.bubbleUser{
  align-self: flex-end;
  background: rgba(125,211,252,.20);
  border: 1px solid rgba(125,211,252,.30);
  color: rgba(224,242,254,.96);
}
.bubbleCornie{
  align-self: flex-start;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  color: rgba(243,244,246,.92);
}
.bubbleError{
  max-width: 100%;
  background: rgba(127,29,29,.28);
  border: 1px solid rgba(248,113,113,.28);
  color: rgba(254,226,226,.96);
}
.bubbleRole{
  font-size: 10px;
  color: rgba(255,255,255,.45);
  margin-bottom: 3px;
}
.bubbleText{
  white-space: pre-wrap;
  word-break: break-word;
}
.bubbleText.thinking{
  color: rgba(255,255,255,.45);
  font-style: italic;
}
.chatBar{
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  width: 100%;
  padding: 4px 6px;
  margin-top: 2px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.2);
  background: rgba(17,24,39,.92);
  box-shadow: 0 4px 14px rgba(0,0,0,.22);
  -webkit-app-region: no-drag;
  position: relative;
  z-index: 2;
}
.chatInputFlat{
  flex: 1 1 auto;
  min-width: 0;
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: rgba(255,255,255,.07);
  color: rgba(243,244,246,.96);
  font-size: 12px;
  outline: none;
}
.chatInputFlat::placeholder{
  color: rgba(156,163,175,.95);
}
.pinBtnSm{
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.08);
  color: rgba(226,232,240,.9);
  font-size: 11px;
  cursor: pointer;
}
.pinBtnSm.on{
  border-color: rgba(125,211,252,.45);
  background: rgba(125,211,252,.18);
}
.sendBtnSm{
  flex: 0 0 auto;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(125,211,252,.35);
  background: rgba(125,211,252,.14);
  color: rgba(226,232,240,.98);
  font-size: 12px;
  cursor: pointer;
}
.sendBtnSm:disabled{
  opacity: .45;
  cursor: not-allowed;
}
</style>
