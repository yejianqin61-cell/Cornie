<script setup>
import { cn } from '../../lib/utils'

defineProps({
  variant: { type: String, default: 'default' }, // default | destructive | outline | secondary | ghost | link | dangerGhost
  size: { type: String, default: 'default' }, // default | sm | lg | icon
})

const variantClasses = {
  default: 'bg-(--color-accent) text-white hover:bg-(--color-accent-hover)',
  destructive: 'bg-(--color-danger) text-white hover:opacity-90',
  outline: 'bg-(--color-surface) hover:bg-(--color-surface-2)',
  secondary: 'bg-(--color-surface-2) hover:bg-(--color-surface-2)',
  ghost: 'bg-transparent text-(--color-muted) hover:bg-(--color-surface-2) hover:text-(--color-text)',
  link: 'bg-transparent text-(--color-accent) underline-offset-4 hover:underline',
  dangerGhost: 'bg-transparent text-(--color-danger) hover:bg-(--color-danger-soft)',
}

const sizeClasses = {
  default: 'rounded-(--radius-sm) px-3.5 py-2.5 text-(--text-md)',
  sm: 'rounded-(--radius-sm) px-2.5 py-2 text-(--text-sm)',
  lg: 'rounded-(--radius-sm) px-4 py-3 text-(--text-md)',
  icon: 'rounded-(--radius-sm) p-2',
}
</script>

<template>
  <button :class="cn(variantClasses[variant], sizeClasses[size])">
    <slot />
  </button>
</template>
