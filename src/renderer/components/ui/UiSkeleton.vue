<template>
  <div class="uiSkeleton" />
</template>

<style scoped>
.uiSkeleton {
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  min-height: 1em;
  animation: uiSkeletonPulse 1.6s ease-in-out infinite;
}
@keyframes uiSkeletonPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
