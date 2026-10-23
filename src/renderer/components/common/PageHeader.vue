<script setup>
defineProps({
  icon: { type: [Object, Function], required: true },
  title: { type: String, required: true },
})
</script>

<template>
  <div class="page-header">
    <div class="page-header-left">
      <component :is="icon" class="page-header-icon" :size="20" />
      <h1 class="page-header-title">{{ title }}</h1>
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 0 #000;
  margin-bottom: 16px;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-header-icon {
  flex-shrink: 0;
}

.page-header-title {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
