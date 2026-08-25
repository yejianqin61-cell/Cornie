<script setup>
import { computed } from 'vue'

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
    <div class="sCard card">
      <div class="sCardTitle">铃湾连接状态</div>
      <div class="sStatus" :class="statusClass">{{ statusText }}</div>
      <div class="sStatusHint" v-if="modelStatus.ok">
        铃湾已经连上了，当前模型：{{ modelStatus.model || modelSettings.model || 'deepseek-chat' }}
      </div>
      <div class="sStatusHint" v-else-if="modelSettings.configured">钥匙已保存：{{ modelSettings.maskedApiKey }}</div>
      <div class="sStatusHint" v-else>还没配置 DeepSeek 钥匙，铃湾暂时不能帮你处理事情。</div>
    </div>

    <!-- DeepSeek 配置入口 -->
    <div class="sCard card">
      <div class="sCardTitle">DeepSeek 配置</div>
      <div class="sCardHint">配置铃湾连接的大模型</div>
      <button class="primary" style="margin-top: 10px" @click="$emit('go', 'deepseek-config')">前往配置</button>
    </div>

    <!-- 数据与隐私 -->
    <div class="sCard card">
      <div class="sCardTitle">数据与隐私</div>
      <div class="sCardHint">
        你的数据保存在本地。当你和铃湾对话时，内容会发送给 DeepSeek。<br />
        铃湾会尽量少带无关内容，但对话本身需要联网。
      </div>
    </div>

    <!-- 高级设置入口 -->
    <div class="sCard card">
      <div class="sCardTitle">高级设置</div>
      <div class="sCardHint">包含高级模式和复杂治理功能，普通用户不需要进入。</div>
      <button class="ghost" style="margin-top: 8px" @click="$emit('go', 'advanced')">进入高级设置 →</button>
    </div>
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
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
}

.sCard {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
}
.sCardTitle {
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 6px;
}
.sCardHint {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
  flex: 1;
}

.sStatus {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}
.sStatus.ok {
  color: #5b9a6b;
}
.sStatus.warn {
  color: #d9a55c;
}
.sStatus.off {
  color: var(--muted);
}
.sStatusHint {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

@media (max-width: 760px) {
  .settingsPage {
    grid-template-columns: 1fr;
  }
}
</style>
