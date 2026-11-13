<script setup>
import { Input } from 'neobrutalism-vue'

// neobrutalism-vue 的 Input 没有声明 modelValue，对它写 v-model 时输入不会写回；
// 这里补上双向绑定，其余属性（placeholder、type、disabled、class、事件）原样交给 Input。
const model = defineModel({ type: String, default: '' })
</script>

<template>
  <Input :value="model" @input="model = $event.target.value" />
</template>
