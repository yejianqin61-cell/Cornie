<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({ scale: { type: Number, default: 1 } })
const emit = defineEmits(['dblclick'])

const canvasRef = ref(null)
let animFrame = null
let startTime = 0
let isDragging = false
let dragStart = { x: 0, y: 0 }

const PART_PATHS = {
  body:     '/pic/body-removebg-preview.png',
  head:     '/pic/head1-removebg-preview.png',
  tail:     '/pic/tail1-removebg-preview.png',
  ring:     '/pic/ring-removebg-preview.png',
  leftEar:  '/pic/leftear-removebg-preview-copy.png',
  rightEar: '/pic/rightear-removebg-preview.png',
  eyeOpen:  '/pic/Avatar.png',
  eyeHalf:  '/pic/halfclosedeye.png',
  eyeClosed:'/pic/closedeye.png',
}

const images = {}

async function loadImages() {
  const entries = Object.entries(PART_PATHS)
  await Promise.all(entries.map(([key, src]) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => { images[key] = img; resolve() }
      img.onerror = () => resolve()
      img.src = src
    })
  }))
}

function drawPet(timestamp) {
  const canvas = canvasRef.value
  if (!canvas || !images.body) { animFrame = requestAnimationFrame(drawPet); return }
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  if (!startTime) startTime = timestamp
  const elapsed = timestamp - startTime

  ctx.clearRect(0, 0, w, h)

  const breathe = 1 + Math.sin(elapsed * 0.003) * 0.02
  const bodyScale = 0.85 * breathe

  // tail wag
  const tailWag = Math.sin(elapsed * 0.008) * 5

  // blink
  const cycle = Math.floor(elapsed / 4000) % 4
  let eyeImg = images.eyeOpen
  if (cycle === 2) eyeImg = images.eyeHalf
  if (cycle === 3) eyeImg = images.eyeClosed

  const cx = w / 2
  const cy = h / 2 + 10

  function drawPart(img, ox, oy, sw, sh, dx, dy, dw, dh, angle = 0) {
    if (!img) return
    ctx.save()
    ctx.translate(dx + dw / 2, dy + dh / 2)
    if (angle !== 0) ctx.rotate(angle * Math.PI / 180)
    ctx.drawImage(img, ox, oy, sw, sh, -dw / 2, -dh / 2, dw, dh)
    ctx.restore()
  }

  // tail
  if (images.tail) {
    const tailW = 60 * bodyScale
    const tailH = images.tail.naturalHeight / images.tail.naturalWidth * tailW
    drawPart(images.tail, 0, 0, images.tail.naturalWidth, images.tail.naturalHeight,
      cx - 30 * bodyScale, cy + 20 * bodyScale, tailW, tailH, 15 + tailWag)
  }

  // ring
  if (images.ring) {
    const ringW = 40 * bodyScale
    const ringH = images.ring.naturalHeight / images.ring.naturalWidth * ringW
    drawPart(images.ring, 0, 0, images.ring.naturalWidth, images.ring.naturalHeight,
      cx - 5 * bodyScale, cy - 10 * bodyScale, ringW, ringH, -10)
  }

  // body
  if (images.body) {
    const bw = 120 * bodyScale
    const bh = images.body.naturalHeight / images.body.naturalWidth * bw
    drawPart(images.body, 0, 0, images.body.naturalWidth, images.body.naturalHeight,
      cx - bw / 2, cy - bh / 2 + 20, bw, bh)
  }

  // head
  if (images.head) {
    const headW = 90 * bodyScale
    const headH = images.head.naturalHeight / images.head.naturalWidth * headW
    drawPart(images.head, 0, 0, images.head.naturalWidth, images.head.naturalHeight,
      cx - headW / 2, cy - 50 * bodyScale, headW, headH)
  }

  // ears
  if (images.leftEar) {
    const earW = 25 * bodyScale
    const earH = images.leftEar.naturalHeight / images.leftEar.naturalWidth * earW
    drawPart(images.leftEar, 0, 0, images.leftEar.naturalWidth, images.leftEar.naturalHeight,
      cx - 30 * bodyScale, cy - 95 * bodyScale, earW, earH, -10)
  }
  if (images.rightEar) {
    const earW = 25 * bodyScale
    const earH = images.rightEar.naturalHeight / images.rightEar.naturalWidth * earW
    drawPart(images.rightEar, 0, 0, images.rightEar.naturalWidth, images.rightEar.naturalHeight,
      cx - 2 * bodyScale, cy - 95 * bodyScale, earW, earH, 10)
  }

  // eyes
  if (eyeImg) {
    const eyeW = 14 * bodyScale
    const eyeH = eyeImg.naturalHeight / eyeImg.naturalWidth * eyeW
    drawPart(eyeImg, 0, 0, eyeImg.naturalWidth, eyeImg.naturalHeight,
      cx - 17 * bodyScale, cy - 62 * bodyScale, eyeW, eyeH)
    drawPart(eyeImg, 0, 0, eyeImg.naturalWidth, eyeImg.naturalHeight,
      cx + 5 * bodyScale, cy - 62 * bodyScale, eyeW, eyeH)
  }

  animFrame = requestAnimationFrame(drawPet)
}

function handleMouseDown(e) {
  isDragging = true
  dragStart = { x: e.screenX, y: e.screenY }
  if (window.cornieDesktop) {
    window.cornieDesktop.dragStart({ screenX: e.screenX, screenY: e.screenY })
  }
  e.preventDefault()
}

function handleMouseMove(e) {
  if (!isDragging) return
  if (window.cornieDesktop) {
    window.cornieDesktop.dragMove({ screenX: e.screenX, screenY: e.screenY })
  }
}

function handleMouseUp() {
  if (!isDragging) return
  isDragging = false
  if (window.cornieDesktop) {
    window.cornieDesktop.dragEnd()
  }
}

onMounted(async () => {
  await loadImages()
  animFrame = requestAnimationFrame(drawPet)
})

onBeforeUnmount(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    width="360"
    height="320"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @dblclick="$emit('dblclick')"
    class="cornie-canvas"
    :style="{ width: 360 * scale + 'px', height: 320 * scale + 'px' }"
  />
</template>

<style scoped>
.cornie-canvas {
  display: block;
  cursor: grab;
  -webkit-app-region: no-drag;
}
.cornie-canvas:active { cursor: grabbing; }
</style>