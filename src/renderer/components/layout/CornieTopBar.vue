<template>
  <header class="nb-topbar">
    <div class="nb-topbar-left">
      <div class="nb-topbar-avatar">
        <img src="/pic/Avatar.png" alt="" />
      </div>
      <span class="nb-topbar-name">CORNIE</span>
    </div>
  </header>
</template>

<style scoped>
.nb-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 8px;
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
</style>
