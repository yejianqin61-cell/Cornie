<script setup>
import { cn } from '../../lib/utils'

defineProps({
  variant: { type: String, default: 'default' }, // default | secondary | destructive | outline
})

const variantClasses = {
  default: 'bg-(--color-surface-2) text-(--color-text)',
  secondary: 'bg-(--color-surface-2) text-(--color-muted)',
  destructive: 'bg-(--color-danger-soft) text-(--color-danger)',
  outline: 'border border-(--color-border) text-(--color-text)',
}
</script>

<template>
  <span :class="cn('rounded-(--radius-sm) px-2 py-0.5 text-(--text-xs) font-medium', variantClasses[variant])">
    <slot />
  </span>
</template>
