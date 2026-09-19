<script setup>
import { Minus, Square, X } from '@lucide/vue'
</script>

<template>
  <header class="nb-topbar">
    <div class="nb-topbar-left">
      <div class="nb-topbar-avatar">
        <img src="/pic/Avatar.png" alt="" />
      </div>
      <span class="nb-topbar-name">CORNIE</span>
    </div>
    <div class="nb-topbar-controls">
      <button class="nb-topbar-btn" title="Minimize">
        <Minus :size="14" />
      </button>
      <button class="nb-topbar-btn" title="Maximize">
        <Square :size="12" />
      </button>
      <button class="nb-topbar-btn nb-topbar-btn--close" title="Close">
        <X :size="14" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.nb-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 4px 0 8px;
  background: #ffd100;
  border-bottom: 3px solid #000;
  user-select: none;
}

.nb-topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nb-topbar-avatar {
  width: 22px;
  height: 22px;
  border: 2px solid #000;
  overflow: hidden;
  flex-shrink: 0;
}

.nb-topbar-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nb-topbar-name {
  color: #000;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1px;
}

.nb-topbar-controls {
  display: flex;
  gap: 2px;
}

.nb-topbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 20px;
  border: 2px solid #000;
  background: transparent;
  color: #000;
  cursor: pointer;
  padding: 0;
}

.nb-topbar-btn:hover {
  background: rgba(0,0,0,0.1);
}

.nb-topbar-btn--close:hover {
  background: #d44;
  border-color: #d44;
  color: #fff;
}
</style>