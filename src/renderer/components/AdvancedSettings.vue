<script setup>
import { ref } from 'vue'
import MemoryWikiWorkspace from './MemoryWikiWorkspace.vue'

const advancedMode = ref(false)
const activePanel = ref('') // '' | 'memory-wiki' | 'versions' | 'rollback' | 'governance' | 'inspection' | 'audit'

const panels = [
  { id: 'memory-wiki', label: 'Memory Wiki 工作台', hint: '页面管理、主题索引等完整功能' },
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
      <button class="ghost" @click="$emit('back')">← 返回设置</button>
      <div class="advTitle">高级设置</div>
      <div class="advToggle">
        <span class="advToggleLabel">高级模式</span>
        <button
          :class="advancedMode ? 'primary' : ''"
          @click="advancedMode = !advancedMode"
        >
          {{ advancedMode ? '已启用' : '已关闭' }}
        </button>
      </div>
    </header>

    <div v-if="!advancedMode" class="advOff card">
      <div class="advOffIcon">🔒</div>
      <div class="advOffTitle">高级模式已关闭</div>
      <div class="advOffHint">
        这些功能面向高级用户，包含复杂治理和系统管理能力。<br />
        日常使用不需要开启。
      </div>
    </div>

    <div v-else class="advPanels">
      <div class="advGrid">
        <button
          v-for="p in panels"
          :key="p.id"
          class="advCard card"
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

      <div v-else-if="activePanel" class="advPlaceholder card">
        <div class="advPlaceholderText">{{ activePanel }} 功能将在后续版本中提供。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.advanced{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
.advHead{
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}
.advTitle{ font-size: 18px; font-weight: 800; }
.advToggle{ margin-left: auto; display: flex; align-items: center; gap: 8px; }
.advToggleLabel{ font-size: 13px; color: var(--muted); }

.advOff{
  padding: 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.advOffIcon{ font-size: 32px; }
.advOffTitle{ font-size: 16px; font-weight: 700; }
.advOffHint{ font-size: 13px; color: var(--muted); line-height: 1.6; }

.advPanels{ flex: 1; display: flex; flex-direction: column; gap: 14px; overflow: hidden; min-height: 0; }
.advGrid{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.advCard{
  padding: 14px;
  cursor: pointer;
  text-align: left;
}
.advCard.active{ border-color: rgba(232,133,106,.30); background: rgba(232,133,106,.06); }
.advCardTitle{ font-weight: 600; font-size: 14px; }
.advCardHint{ font-size: 12px; color: var(--muted); margin-top: 4px; }

.advPanelContent{ flex: 1; min-height: 0; overflow: auto; }

.advPlaceholder{
  padding: 40px;
  text-align: center;
  color: var(--muted);
}

@media (max-width: 760px){
  .advGrid{ grid-template-columns: 1fr 1fr; }
}
</style>
