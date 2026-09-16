<script setup>
import { Receipt } from '@lucide/vue'
import EmptyState from '../common/EmptyState.vue'
</script>

<template>
  <EmptyState :icon="Receipt" text="暂无收支记录" />
</template>