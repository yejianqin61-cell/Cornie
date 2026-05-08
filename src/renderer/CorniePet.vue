<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { cornieCssVars, cornieEyeOverlay, corniePetTransform, cornieStage } from './cornieConfig'
import { createCornieBlinkController } from './cornieBlink'

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
const eyeLayer = ref('none') // none | half | closed

const editing = ref(false)
const overlay = reactive({ ...cornieEyeOverlay })

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

onMounted(() => {
  editing.value = parseEditingFromUrl()

  blink = createCornieBlinkController({
    showLayer,
    hideLayers,
    setHeadDipPx: (px) => (headDipPx.value = px)
  })
  blink.start()

  // 快捷键：E 切编辑、B 立刻眨眼、C 复制配置
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  blink?.stop?.()
  window.removeEventListener('keydown', onKeyDown)
})

function onKeyDown(e) {
  const k = e.key?.toLowerCase?.()
  if (k === 'e') {
    editing.value = !editing.value
  } else if (k === 'b') {
    blink?.blinkNow?.()
  } else if (k === 'c') {
    copyConfig()
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

function stagePoint(e) {
  const el = e.currentTarget?.closest?.('.stage')
  const rect = el?.getBoundingClientRect?.()
  if (!rect) return { x: 0, y: 0 }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

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
  if (!editing.value) return
  if (!drag) return
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
  if (!editing.value) return
  if (!resize) return
  const dx = e.clientX - resize.startX
  const dy = e.clientY - resize.startY
  overlay.w = Math.max(10, Math.round(resize.baseW + dx))
  overlay.h = Math.max(10, Math.round(resize.baseH + dy))
}
</script>

<template>
  <div class="petRoot">
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

          <!-- 眨眼覆盖层：只挂在 head 上 -->
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
</template>

<style scoped>
.petRoot{
  width: 100vw;
  height: 100vh;
  display:grid;
  place-items:center;
  background: transparent;
  overflow:hidden;
  -webkit-app-region: drag;
}
.stageWrap{
  position: relative;
  overflow: visible;
  -webkit-app-region: drag;
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

/* 固化配置：每个部件使用对应 CSS 变量 */
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

/* 眨眼覆盖层（在 head 内部定位，继承 head 的变换） */
.headPart{ }
.eyeGroup{
  position:absolute;
  pointer-events: none;
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
</style>

