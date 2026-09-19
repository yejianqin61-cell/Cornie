<script setup>
</script>

<template>
  <footer class="nb-statusbar">
    <div class="nb-statusbar-left">
      <span class="nb-status-dot"></span>
      <span>在线</span>
    </div>
    <div class="nb-statusbar-right">
      <slot />
    </div>
  </footer>
</template>

<style scoped>
.nb-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 10px;
  background: #f0ebe0;
  border-top: 3px solid #000;
  font-size: 11px;
  font-weight: 700;
  color: #555;
}

.nb-statusbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nb-status-dot {
  width: 8px;
  height: 8px;
  background: #4a4;
  border: 2px solid #000;
  flex-shrink: 0;
}

.nb-statusbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>