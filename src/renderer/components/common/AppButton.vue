<script setup>
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'default' },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
})

const attrs = useAttrs()

const VARIANTS = {
  primary: 'neobrutalism-button-primary',
  secondary: 'neobrutalism-button-secondary',
  success: 'neobrutalism-button-success',
  warning: 'neobrutalism-button-warning text-black',
  danger: 'neobrutalism-button-danger',
  outline: 'neobrutalism-button-outline',
  neutral: 'neobrutalism-button-outline',
}

const SIZES = {
  sm: 'neobrutalism-button-sm',
  default: 'neobrutalism-button',
  lg: 'neobrutalism-button-lg',
  icon: 'app-button-icon',
}

const bindAttrs = computed(() => {
  const { class: ignored, ...rest } = attrs
  return rest
})

const classes = computed(() => [
  'neobrutalism-button inline-flex items-center justify-center whitespace-nowrap font-bold uppercase tracking-wide transition-all duration-100 ease-in-out outline-none overflow-visible',
  VARIANTS[props.variant] || VARIANTS.primary,
  SIZES[props.size] || SIZES.default,
  attrs.class,
])
</script>

<template>
  <button v-bind="bindAttrs" :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>

<style scoped>
.app-button-icon {
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  flex-shrink: 0;
}
</style>
