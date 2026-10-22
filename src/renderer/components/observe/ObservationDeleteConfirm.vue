<script setup>
import ConfirmDialog from '../common/ConfirmDialog.vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  error: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <ConfirmDialog
    :open="open"
    title="删除观察记录"
    :message="'确认删除「' + (title || '无标题') + '」这条观察记录吗？'"
    :error="error"
    :onConfirm="() => $emit('confirm')"
    :onCancel="() => $emit('cancel')"
  />
</template>
