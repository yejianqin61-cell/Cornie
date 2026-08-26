<script setup>
import { ref } from 'vue'
import MemoryWikiWorkspace from './MemoryWikiWorkspace.vue'
import UiButton from './ui/UiButton.vue'
import UiEmpty from './ui/UiEmpty.vue'

const advancedMode = ref(false)
const activePanel = ref('') // '' | 'memory-wiki' | 'versions' | 'rollback' | 'governance' | 'inspection' | 'audit'

const panels = [
  // R-07：与前台"记忆 Wiki"入口分工——本工作台定位为治理/高级功能，日常翻阅与编辑在前台
  { id: 'memory-wiki', label: '记忆治理工作台', hint: '版本回滚、主题索引、治理审核、巡检与审计' },
  { id: 'versions', label: '版本历史', hint: '查看页面的历史版本' },
  { id: 'rollback', label: '页面回滚', hint: '将页面恢复到历史版本' },
  { id: 'governance', label: '治理审核池', hint: '待审核的治理请求' },
  { id: 'inspection', label: '巡检结果', hint: '系统巡检发现的问题' },
  { id: 'audit', label: '审计查看', hint: '操作审计记录' },
]
</script>

<template>
  <div class="advanced">
    <header class="advHead">
      <UiButton variant="ghost" @click="$emit('back')">← 返回设置</UiButton>
      <div class="advTitle">高级设置</div>
      <div class="advToggle">
        <span class="advToggleLabel">高级模式</span>
        <UiButton :variant="advancedMode ? 'default' : 'outline'" @click="advancedMode = !advancedMode">
          {{ advancedMode ? '已启用' : '已关闭' }}
        </UiButton>
      </div>
    </header>

    <UiEmpty v-if="!advancedMode" icon="🔒" text="高级模式已关闭，面向高级用户">
      <template #action>
        <UiButton variant="default" @click="advancedMode = true">开启高级模式</UiButton>
      </template>
    </UiEmpty>

    <div v-else class="advPanels">
      <div class="advGrid">
        <button
          v-for="p in panels"
          :key="p.id"
          class="advCard"
          :class="{ active: activePanel === p.id }"
          @click="activePanel = activePanel === p.id ? '' : p.id"
        >
          <div class="advCardTitle">{{ p.label }}</div>
          <div class="advCardHint">{{ p.hint }}</div>
        </button>
      </div>

      <div v-if="activePanel === 'memory-wiki'" class="advPanelContent">
        <MemoryWikiWorkspace />
      </div>

      <div v-else-if="activePanel" class="advPlaceholder">即将提供</div>
    </div>
  </div>
</template>

<style scoped>
.advanced {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
.advHead {
  display: flex;
  align-items: center;
  gap: 14px;
}
.advTitle {
  font-size: var(--text-xl);
  font-weight: 800;
}
.advToggle {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.advToggleLabel {
  font-size: var(--text-base);
  color: var(--muted);
}

.advPanels {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
  min-height: 0;
}
.advGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.advCard {
  padding: 14px;
  cursor: pointer;
  text-align: left;
  background: transparent;
}
.advCard:hover {
  background: var(--surface-2);
}
.advCard.active {
  background: color-mix(in srgb, var(--color-accent) 6%, transparent);
}
.advCardTitle {
  font-weight: 600;
  font-size: var(--text-md);
}
.advCardHint {
  font-size: var(--text-sm);
  color: var(--muted);
  margin-top: 4px;
}

.advPanelContent {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.advPlaceholder {
  padding: 40px;
  text-align: center;
  color: var(--muted);
}

@media (max-width: 760px) {
  .advGrid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
