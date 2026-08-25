<script setup>
import { computed, reactive, ref } from 'vue'
import { createCornieBlinkController } from './cornieBlink'
import { cornieEyeOverlay as defaultEyeOverlay, cornieParts as fixedParts } from './cornieConfig'

// 固定贴图（除眼睛覆盖层外）：使用已固化布局，不再允许拖动/编辑
const assetById = {
  head: { label: '头', src: '/pic/head1-removebg-preview.png' },
  body: { label: '身体', src: '/pic/body-removebg-preview.png' },
  ring: { label: '铃铛', src: '/pic/ring-removebg-preview.png' },
  tail1: { label: '尾巴', src: '/pic/tail1-removebg-preview.png' },
}

const eyeHalfSrc = '/pic/halfclosedeye.png'
const eyeClosedSrc = '/pic/closedeye.png'

const stageRef = ref(null)
const showChecker = ref(true)
const parts = reactive(
  fixedParts.map((p) => ({
    ...p,
    label: assetById[p.id]?.label || p.id,
    src: assetById[p.id]?.src || '',
  }))
)
// 固定贴图不再支持选择；为了编辑眼睛，默认聚焦 head
const selectedId = ref('head')

// eye overlay config is relative to head part (inherits head transform)
const eyeOverlay = reactive({ ...defaultEyeOverlay })
const eyeLayer = ref('none') // none | half | closed
const blinkPreviewOn = ref(false)

const eyeOverlayStyle = computed(() => ({
  left: `${eyeOverlay.x}px`,
  top: `${eyeOverlay.y}px`,
  width: `${eyeOverlay.w}px`,
  height: `${eyeOverlay.h}px`,
  transform: `rotate(${eyeOverlay.rot}deg)`,
  opacity: eyeOverlay.opacity,
}))

function showLayer(name) {
  eyeLayer.value = name
}
function hideLayers() {
  eyeLayer.value = 'none'
}

let blink = null
function ensureBlinkController() {
  if (blink) return blink
  blink = createCornieBlinkController({
    showLayer,
    hideLayers,
    setHeadDipPx: () => {},
  })
  return blink
}

const exportingJson = computed(() => {
  const payload = parts
    .slice()
    .sort((a, b) => a.z - b.z)
    .map(({ id, x, y, scale, rot, opacity, z }) => ({ id, x, y, scale, rot, opacity, z }))
  return JSON.stringify(
    {
      version: 1,
      stage: { w: 420, h: 420 },
      parts: payload,
      eyeOverlay: { ...eyeOverlay },
    },
    null,
    2
  )
})

function exportCssVars() {
  const lines = []
  for (const p of parts.slice().sort((a, b) => a.z - b.z)) {
    lines.push(
      `--${p.id}-x:${Math.round(p.x)}px;--${p.id}-y:${Math.round(p.y)}px;--${p.id}-s:${p.scale.toFixed(
        3
      )};--${p.id}-r:${p.rot.toFixed(1)}deg;--${p.id}-o:${p.opacity.toFixed(3)};--${p.id}-z:${p.z};`
    )
  }
  return lines.join('\\n')
}

const exportingCss = computed(() => exportCssVars())

async function copy(text) {
  await navigator.clipboard.writeText(text)
}

let draggingEye = null
let resizingEye = null
function onPointerUp() {
  draggingEye = null
  resizingEye = null
}

function onEyeDown(e) {
  e.stopPropagation()
  draggingEye = {
    startX: e.clientX,
    startY: e.clientY,
    baseX: eyeOverlay.x,
    baseY: eyeOverlay.y,
  }
  e.currentTarget.setPointerCapture?.(e.pointerId)
}

function onEyeMove(e) {
  if (!draggingEye) return
  const dx = e.clientX - draggingEye.startX
  const dy = e.clientY - draggingEye.startY
  eyeOverlay.x = Math.round(draggingEye.baseX + dx)
  eyeOverlay.y = Math.round(draggingEye.baseY + dy)
}

function onEyeHandleDown(e) {
  e.stopPropagation()
  resizingEye = {
    startX: e.clientX,
    startY: e.clientY,
    baseW: eyeOverlay.w,
    baseH: eyeOverlay.h,
  }
  e.currentTarget.setPointerCapture?.(e.pointerId)
}

function onEyeHandleMove(e) {
  if (!resizingEye) return
  const dx = e.clientX - resizingEye.startX
  const dy = e.clientY - resizingEye.startY
  eyeOverlay.w = Math.max(10, Math.round(resizingEye.baseW + dx))
  eyeOverlay.h = Math.max(10, Math.round(resizingEye.baseH + dy))
}

async function blinkOncePreview() {
  const c = ensureBlinkController()
  await c.blinkNow()
}

function toggleBlinkPreview() {
  blinkPreviewOn.value = !blinkPreviewOn.value
  const c = ensureBlinkController()
  if (blinkPreviewOn.value) c.start()
  else c.stop()
}
</script>

<template>
  <div class="wrap">
    <section class="stage card">
      <div class="stageTop">
        <div class="stageTitle">Cornie 拼装编辑器</div>
        <label class="toggle">
          <input type="checkbox" v-model="showChecker" />
          <span>显示棋盘底</span>
        </label>
      </div>

      <div
        ref="stageRef"
        class="canvas"
        :class="{ checker: showChecker }"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @pointerleave="onPointerUp"
      >
        <div
          v-for="p in parts.slice().sort((a, b) => a.z - b.z)"
          :key="p.id"
          class="part"
          :class="{ selected: p.id === selectedId }"
          :style="{
            transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg) scale(${p.scale})`,
            opacity: p.opacity,
            zIndex: p.z,
          }"
        >
          <img :src="p.src" :alt="p.label" draggable="false" />

          <!-- 眼睛覆盖层：只挂在 head 部件内部（继承 head 的变换） -->
          <div
            v-if="p.id === 'head'"
            class="eyeGroup"
            :style="eyeOverlayStyle"
            @pointerdown="onEyeDown"
            @pointermove="onEyeMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @pointerleave="onPointerUp"
          >
            <div class="eyeOutline show"></div>
            <div
              class="eyeHandle"
              :class="{ show: true }"
              @pointerdown="onEyeHandleDown"
              @pointermove="onEyeHandleMove"
            ></div>

            <img v-show="eyeLayer === 'half'" class="eyeLayer" :src="eyeHalfSrc" alt="eye half" />
            <img v-show="eyeLayer === 'closed'" class="eyeLayer" :src="eyeClosedSrc" alt="eye closed" />
          </div>
        </div>
      </div>
    </section>

    <aside class="panel card">
      <div class="panelTitle">固定贴图</div>
      <div class="fixedHint">头/身体/尾巴/铃铛布局已从配置固化，当前页面仅用于对齐眨眼覆盖层（半闭/闭眼）。</div>

      <div class="panelTitle">眨眼覆盖层（挂在头部）</div>
      <div class="controls">
        <div class="row">
          <div class="k">x</div>
          <input type="number" v-model.number="eyeOverlay.x" />
        </div>
        <div class="row">
          <div class="k">y</div>
          <input type="number" v-model.number="eyeOverlay.y" />
        </div>
        <div class="row">
          <div class="k">w</div>
          <input type="number" v-model.number="eyeOverlay.w" />
        </div>
        <div class="row">
          <div class="k">h</div>
          <input type="number" v-model.number="eyeOverlay.h" />
        </div>
        <div class="row">
          <div class="k">rot</div>
          <input type="range" min="-30" max="30" step="0.1" v-model.number="eyeOverlay.rot" />
          <div class="v">{{ eyeOverlay.rot.toFixed(1) }}°</div>
        </div>
        <div class="row">
          <div class="k">opacity</div>
          <input type="range" min="0" max="1" step="0.01" v-model.number="eyeOverlay.opacity" />
          <div class="v">{{ eyeOverlay.opacity.toFixed(2) }}</div>
        </div>

        <div class="btns">
          <button @click="blinkOncePreview">眨眼预览</button>
          <button @click="toggleBlinkPreview">
            {{ blinkPreviewOn ? '关闭随机眨眼' : '开启随机眨眼' }}
          </button>
        </div>
      </div>

      <div class="panelTitle">导出（复制给我）</div>
      <div class="export">
        <div class="exportRow">
          <button @click="copy(exportingJson)">复制 JSON</button>
          <button @click="copy(exportingCss)">复制 CSS 变量</button>
        </div>
        <textarea class="mono" :value="exportingJson" readonly />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.wrap {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 14px;
  min-height: 0;
}
.stage {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.stageTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.stageTitle {
  font-weight: 800;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}
.canvas {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: transparent;
}
.canvas.checker {
  background-image:
    linear-gradient(45deg, rgba(255, 255, 255, 0.06) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.06) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.06) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.06) 75%);
  background-size: 24px 24px;
  background-position:
    0 0,
    0 12px,
    12px -12px,
    -12px 0px;
}
.part {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  cursor: default;
  user-select: none;
  padding: 2px;
  border-radius: 10px;
}
.part.selected {
  outline: none;
  background: transparent;
}
.part img {
  display: block;
  max-width: none;
  pointer-events: none;
}

.eyeGroup {
  position: absolute;
  pointer-events: auto;
  cursor: grab;
}
.eyeGroup:active {
  cursor: grabbing;
}
.eyeLayer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}
.eyeOutline {
  position: absolute;
  inset: 0;
  border: 1px dashed rgba(125, 211, 252, 0.75);
  border-radius: 10px;
  background: rgba(125, 211, 252, 0.06);
  display: none;
}
.eyeHandle {
  position: absolute;
  width: 10px;
  height: 10px;
  right: -6px;
  bottom: -6px;
  border-radius: 999px;
  background: rgba(125, 211, 252, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.35);
  cursor: nwse-resize;
  display: none;
}
.eyeOutline.show,
.eyeHandle.show {
  display: block;
}

.panel {
  overflow: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panelTitle {
  font-weight: 800;
  margin-top: 4px;
}
.fixedHint {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}
.parts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.partBtn {
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 12px;
}
.partBtn.active {
  border-color: rgba(125, 211, 252, 0.35);
  background: rgba(125, 211, 252, 0.1);
}
.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: grid;
  grid-template-columns: 70px 1fr 70px;
  align-items: center;
  gap: 10px;
}
.row input[type=\"number\"] {
  grid-column: 2 / span 2;
}
.k {
  color: var(--muted);
  font-size: 12px;
}
.v {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
  font-size: 12px;
}
.btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.exportRow {
  display: flex;
  gap: 10px;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, \"Liberation Mono\", monospace;
  font-size: 12px;
  min-height: 220px;
}

@media (max-width: 980px) {
  .wrap {
    grid-template-columns: 1fr;
  }
}
</style>
