<script setup>
import { MessageCircle } from '@lucide/vue'
import EmptyState from '../common/EmptyState.vue'

defineProps({
  text: { type: String, default: '今天还没有聊天记录' },
})
</script>

<template>
  <EmptyState :icon="MessageCircle" :text="text" />
</template>