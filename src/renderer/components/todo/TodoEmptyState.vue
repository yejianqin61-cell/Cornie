<script setup>
import { ListTodo } from '@lucide/vue'
import EmptyState from '../common/EmptyState.vue'
</script>

<template>
  <div class="todo-empty">
    <EmptyState :icon="ListTodo" text="暂无待办事项" />
  </div>
</template>

<style scoped>
.todo-empty { padding: 2rem 1rem; }
</style>