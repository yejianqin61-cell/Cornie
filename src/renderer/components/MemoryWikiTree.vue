<script setup>
// T-01：记忆 Wiki 文件树（Cornie-024）。
// 纯展示组件：输入扁平页面列表，构建 类型目录 → 页面文件 的一级树；
// 目录可折叠/展开（受控 expandedKeys 或内部状态）、文件可选中、空目录占位、已归档独立灰显。

import { computed, ref } from 'vue'

const props = defineProps({
  pages: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' },
  // 受控展开目录（传入则外部管理，否则组件内部管理）
  expandedKeys: { type: Array, default: null },
})

const emit = defineEmits(['select', 'toggle'])

// 目录顺序：身份 4 类固定在前 → 普通类型 → 已归档最后
const TYPE_ORDER = [
  { key: 'identity_profile', label: '关于你' },
  { key: 'identity_person', label: '重要的人' },
  { key: 'identity_preference', label: '你的偏好' },
  { key: 'identity_trait', label: '你的特征' },
  { key: 'event', label: '事件' },
  { key: 'topic', label: '主题' },
  { key: 'goal', label: '目标' },
  { key: 'project', label: '项目' },
  { key: 'routine', label: '习惯' },
  { key: 'need', label: '需要' },
  { key: 'other', label: '其他' },
]

// 默认展开身份 4 类
const internalExpanded = ref(new Set(['identity_profile', 'identity_person', 'identity_preference', 'identity_trait']))

const isControlled = computed(() => Array.isArray(props.expandedKeys))
const expandedSet = computed(() => (isControlled.value ? new Set(props.expandedKeys) : internalExpanded.value))

function isExpanded(key) {
  return expandedSet.value.has(key)
}

function toggleKey(key) {
  if (isControlled.value) {
    emit('toggle', key)
    return
  }
  const next = new Set(internalExpanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  internalExpanded.value = next
}

const tree = computed(() => {
  const groups = TYPE_ORDER.map((t) => ({ ...t, pages: [] }))
  const archived = { key: 'archived', label: '已归档', pages: [] }

  for (const page of props.pages || []) {
    if (page?.status === 'archived') {
      archived.pages.push(page)
      continue
    }
    const group = groups.find((g) => g.key === page?.pageType)
    if (group) group.pages.push(page)
    else groups[groups.length - 1].pages.push(page) // 未知类型归"其他"
  }

  for (const group of [...groups, archived]) {
    group.pages.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'zh-Hans-CN'))
  }

  // 归档目录为空时不显示
  return [...groups, ...(archived.pages.length > 0 ? [archived] : [])]
})
</script>

<template>
  <div class="wikiTree">
    <div v-for="group in tree" :key="group.key" class="treeGroup">
      <div class="treeDir" @click="toggleKey(group.key)">
        <span class="treeDirIcon">{{ isExpanded(group.key) ? '📂' : '📁' }}</span>
        <span class="treeDirLabel">{{ group.label }}</span>
        <span v-if="group.pages.length === 0" class="treeDirEmpty">（空）</span>
        <span v-else class="treeDirCount">{{ group.pages.length }}</span>
      </div>

      <div v-if="isExpanded(group.key)" class="treeFiles">
        <div v-if="group.pages.length === 0" class="treeEmptyRow">还没有这一类的记忆</div>
        <div
          v-for="page in group.pages"
          :key="page.id"
          class="treeFile"
          :class="{ active: page.id === selectedId, archived: group.key === 'archived' }"
          @click="emit('select', page)"
        >
          <span class="treeFileIcon">📄</span>
          <span class="treeFileLabel">{{ page.title || '未命名记忆' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wikiTree {
  height: 100%;
  overflow-y: auto;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}
.wikiTree::-webkit-scrollbar {
  width: 4px;
}
.wikiTree::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
}

.treeDir {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
}
.treeDir:hover {
  background: rgba(0, 0, 0, 0.04);
}
.treeDirIcon {
  font-size: 12px;
}
.treeDirLabel {
  font-weight: 600;
}
.treeDirCount {
  margin-left: auto;
  font-size: 11px;
  color: var(--muted);
}
.treeDirEmpty {
  margin-left: auto;
  font-size: 11px;
  color: var(--muted);
  opacity: 0.7;
}

.treeFiles {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-left: 14px;
  padding-left: 8px;
  border-left: 1px solid rgba(0, 0, 0, 0.06);
}
.treeEmptyRow {
  padding: 4px 8px;
  font-size: 12px;
  color: var(--muted);
  opacity: 0.7;
}

.treeFile {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  color: var(--text);
}
.treeFile:hover {
  background: rgba(0, 0, 0, 0.04);
}
.treeFile.active {
  background: rgba(232, 133, 106, 0.12);
  color: #c96f52;
  font-weight: 600;
}
.treeFileIcon {
  font-size: 12px;
  opacity: 0.8;
}
.treeFileLabel {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 已归档：灰显 */
.treeFile.archived {
  color: var(--muted);
  opacity: 0.7;
}
.treeFile.archived.active {
  background: rgba(0, 0, 0, 0.05);
  color: var(--muted);
  font-weight: 400;
}
</style>
