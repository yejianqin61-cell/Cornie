<script setup>
import CornieTopBar from './CornieTopBar.vue'
import CornieStatusBar from './CornieStatusBar.vue'
</script>

<template>
  <div class="nb-layout">
    <CornieTopBar />
    <div class="nb-layout-body">
      <slot name="sidebar" />
      <div class="nb-layout-main">
        <slot />
      </div>
    </div>
    <CornieStatusBar>
      <slot name="status" />
    </CornieStatusBar>
  </div>
</template>

<style scoped>
.nb-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffd100;
}

.nb-layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.nb-layout-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>