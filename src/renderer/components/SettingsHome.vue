<script setup>
import { computed } from 'vue'
import UiButton from './ui/UiButton.vue'
import UiCard from './ui/UiCard.vue'

const props = defineProps({
  modelStatus: { type: Object, default: () => ({ ok: false, configured: false, model: '' }) },
  modelSettings: { type: Object, default: () => ({ configured: false, maskedApiKey: '', model: '' }) },
})

defineEmits(['go'])

const statusText = computed(() => {
  if (props.modelStatus.ok) return '已连接'
  if (props.modelStatus.configured) return '未连接（钥匙可能在但连不上）'
  return '未配置'
})

const statusClass = computed(() => {
  if (props.modelStatus.ok) return 'ok'
  if (props.modelStatus.configured) return 'warn'
  return 'off'
})
</script>

<template>
  <div class="settingsPage">
    <!-- 铃湾连接状态 -->
    <UiCard class="sCard">
      <div class="sCardTitle">铃湾连接状态</div>
      <div class="sStatus" :class="statusClass">{{ statusText }}</div>
      <div class="sStatusHint" v-if="modelStatus.ok">
        当前模型：{{ modelStatus.model || modelSettings.model || 'deepseek-chat' }}
      </div>
      <div class="sStatusHint" v-else-if="modelSettings.configured">钥匙已保存：{{ modelSettings.maskedApiKey }}</div>
    </UiCard>

    <!-- DeepSeek 配置入口 -->
    <UiCard class="sCard">
      <div class="sCardTitle">DeepSeek 配置</div>
      <UiButton variant="default" @click="$emit('go', 'deepseek-config')">前往配置</UiButton>
    </UiCard>

    <!-- 数据与隐私 -->
    <UiCard class="sCard">
      <div class="sCardTitle">数据与隐私</div>
      <div class="sCardHint">数据保存在本地；对话内容会发送给模型服务。</div>
    </UiCard>

    <!-- 高级设置入口 -->
    <UiCard class="sCard">
      <div class="sCardTitle">高级设置</div>
      <UiButton variant="ghost" @click="$emit('go', 'advanced')">进入高级设置 →</UiButton>
    </UiCard>
  </div>
</template>

<style scoped>
.settingsPage {
  height: 100%;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-right: 4px;
  align-content: start;
}
.settingsPage::-webkit-scrollbar {
  width: 4px;
}
.settingsPage::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  border-radius: 999px;
}

.sCard {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.sCardTitle {
  font-weight: 700;
  font-size: var(--text-md);
  margin-bottom: 6px;
}
.sCardHint {
  font-size: var(--text-base);
  color: var(--muted);
  line-height: 1.6;
}

.sStatus {
  font-size: var(--text-2xl);
  font-weight: 800;
  margin-bottom: 6px;
}
.sStatus.ok {
  color: var(--success);
}
.sStatus.warn {
  color: var(--warning);
}
.sStatus.off {
  color: var(--muted);
}
.sStatusHint {
  font-size: var(--text-sm);
  color: var(--muted);
}
</style>
