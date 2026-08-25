<script setup>
import { ScrollAreaCorner, ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
</script>

<template>
  <ScrollAreaRoot class="uiScrollArea">
    <ScrollAreaViewport class="uiScrollAreaViewport">
      <slot />
    </ScrollAreaViewport>
    <ScrollAreaScrollbar orientation="vertical" class="uiScrollBar">
      <ScrollAreaThumb class="uiScrollThumb" />
    </ScrollAreaScrollbar>
    <ScrollAreaCorner class="uiScrollCorner" />
  </ScrollAreaRoot>
</template>

<style scoped>
.uiScrollArea {
  position: relative;
  overflow: hidden;
  min-height: 0;
}
.uiScrollAreaViewport {
  width: 100%;
  height: 100%;
}
.uiScrollBar {
  width: 8px;
  padding: 2px 0;
}
.uiScrollThumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 999px;
}
.uiScrollCorner {
  background: transparent;
}
</style>
