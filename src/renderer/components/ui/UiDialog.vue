<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
})
const emit = defineEmits(['update:open'])

const openValue = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})
</script>

<template>
  <DialogRoot v-model:open="openValue">
    <DialogTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="uiDialogOverlay" />
      <DialogContent class="uiDialogContent">
        <div class="uiDialogHead">
          <DialogTitle class="uiDialogTitle">{{ title }}</DialogTitle>
          <DialogClose class="uiDialogClose" aria-label="关闭">
            <X :size="16" />
          </DialogClose>
        </div>
        <DialogDescription v-if="description" class="uiDialogDescription">
          {{ description }}
        </DialogDescription>
        <div class="uiDialogBody">
          <slot />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.uiDialogOverlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(45, 42, 38, 0.35);
}
.uiDialogContent {
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 61;
  transform: translate(-50%, -50%);
  width: min(560px, calc(100vw - 48px));
  max-height: calc(100vh - 80px);
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-raised);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.uiDialogHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.uiDialogTitle {
  font-weight: 800;
  font-size: var(--text-xl);
}
.uiDialogClose {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: var(--radius-sm);
  color: var(--muted);
  line-height: 0;
}
.uiDialogClose:hover {
  background: var(--surface-2);
  color: var(--text);
}
.uiDialogDescription {
  color: var(--muted);
  font-size: var(--text-base);
  line-height: 1.6;
}
.uiDialogBody {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
