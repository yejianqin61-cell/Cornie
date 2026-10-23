<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import CorniePet from './CorniePet.vue'
import CornieBubble from './CornieBubble.vue'
import PetSettings from './PetSettings.vue'

const petScale = ref(1)
const alwaysOnTop = ref(false)
const bubbleText = ref('')
const bubbleVisible = ref(false)
const settingsVisible = ref(false)

let bubbleTimer = null
const TIPS = ['该喝水了', '记得写日记', '今天有什么新鲜事？']

function showBubble(text) {
  bubbleText.value = text
  bubbleVisible.value = true
  clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => {
    bubbleVisible.value = false
  }, 4000)
}

function randomBubble() {
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)]
  showBubble(tip)
}

onMounted(async () => {
  if (window.cornieDesktop) {
    try {
      alwaysOnTop.value = await window.cornieDesktop.getAlwaysOnTop()
    } catch {}
  }
  randomBubble()

  const interval = setInterval(() => {
    if (!bubbleVisible.value) randomBubble()
  }, 30000)

  onBeforeUnmount(() => {
    clearInterval(interval)
    clearTimeout(bubbleTimer)
  })
})

function toggleSettings() {
  settingsVisible.value = !settingsVisible.value
}

function onScaleChange(s) {
  petScale.value = s
}

async function onToggleAlwaysOnTop(v) {
  alwaysOnTop.value = v
  if (window.cornieDesktop) {
    try {
      await window.cornieDesktop.setAlwaysOnTop(v)
    } catch {}
  }
}

function onOpenMain() {
  if (window.cornieDesktop) {
    window.cornieDesktop.showMainWindow()
  }
}
</script>

<template>
  <div class="corne-app" :style="{ transform: `scale(${petScale})`, transformOrigin: 'top left' }">
    <CornieBubble v-if="bubbleVisible" :text="bubbleText" />
    <CorniePet :scale="petScale" @dblclick="onOpenMain" />
    <PetSettings
      v-if="settingsVisible"
      :scale="petScale"
      :alwaysOnTop="alwaysOnTop"
      @scale-change="onScaleChange"
      @toggle-always-on-top="onToggleAlwaysOnTop"
      @close="settingsVisible = false"
    />
    <button class="corne-settings-toggle" @click="toggleSettings" title="设置">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3" />
        <path
          d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.corne-app {
  width: 360px;
  height: 320px;
  position: relative;
  overflow: hidden;
}
.corne-settings-toggle {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(255, 255, 255, 0.6);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s;
}
.corne-app:hover .corne-settings-toggle {
  opacity: 1;
}
</style>
