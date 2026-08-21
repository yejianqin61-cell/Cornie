<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['run-inspection', 'refresh'])
</script>

<template>
  <header class="workspaceHead">
    <div>
      <div class="workspaceTitle">Memory Wiki 工作台</div>
      <div class="workspaceHint">
        主人可以直接看长期记忆页面、主题索引、治理待审核池，还有那些需要你亲自点头的高风险动作。
      </div>
    </div>
    <div class="headActions">
      <button :disabled="saving" @click="emit('run-inspection')">
        {{ saving ? '处理中…' : '运行巡检入池' }}
      </button>
      <button :disabled="loading" @click="emit('refresh')">
        {{ loading ? '刷新中…' : '刷新全部' }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.workspaceHead{
  display:flex;
  justify-content: space-between;
  align-items:flex-start;
  gap: 12px;
}
.workspaceTitle{ font-size: 22px; font-weight: 800; }
.workspaceHint{ margin-top: 6px; color: var(--muted); font-size: 13px; line-height: 1.5; max-width: 720px; }
.headActions{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
}
@media (max-width: 720px){
  .workspaceHead{
    flex-direction: column;
  }
}
</style>
