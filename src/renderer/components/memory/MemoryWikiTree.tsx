// 记忆 Wiki 文件树（React 版 components/MemoryWikiTree.vue）。
// 用 Mantine 9 内置 Tree 承接：适配层把"类型目录 → 页面"旧数据形状映射为 TreeNodeData[]
// （目录序/未知类型归"其他"/归档灰显目录空则隐藏/zh-Hans-CN 排序不变）；
// 受控 expanded/selected 走 useTree({ expandedState, selectedState })，空目录塞占位子节点
// 以保留"可展开的（空）目录 + 占位行"旧行为（规格 §4.2 建议方案）。

import { useMemo, useRef } from 'react'
import {
  Badge,
  Box,
  Group,
  Text,
  Tree,
  UnstyledButton,
  useTree,
  type RenderTreeNodePayload,
  type TreeNodeData,
} from '@mantine/core'
import { IconFile, IconFolder, IconFolderOpen } from '@tabler/icons-react'

export interface MemoryWikiTreePage {
  id: string
  title?: string
  pageType?: string
  status?: string
  [key: string]: unknown
}

interface TreeGroup {
  key: string
  label: string
}

// 目录顺序：身份 4 类固定在前 → 普通类型 → 已归档最后
const TYPE_ORDER: TreeGroup[] = [
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

const ARCHIVED_KEY = 'archived'
const EMPTY_PLACEHOLDER_SUFFIX = '::empty'

type NodeKind = 'group' | 'page' | 'placeholder'

interface MemoryWikiNodeProps {
  kind: NodeKind
  count?: number
  archived?: boolean
  page?: MemoryWikiTreePage
}

interface MemoryWikiTreeProps {
  pages: MemoryWikiTreePage[]
  selectedId: string
  /** 受控展开目录（数组形式，与旧 expandedKeys/localStorage 兼容） */
  expandedKeys: string[]
  onExpandedChange: (keys: string[]) => void
  onSelect: (page: MemoryWikiTreePage) => void
}

function buildTreeData(pages: MemoryWikiTreePage[]): TreeNodeData[] {
  const groups: Array<TreeGroup & { items: MemoryWikiTreePage[] }> = TYPE_ORDER.map((t) => ({ ...t, items: [] }))
  const archived: TreeGroup & { items: MemoryWikiTreePage[] } = { key: ARCHIVED_KEY, label: '已归档', items: [] }

  for (const page of pages || []) {
    if (page?.status === ARCHIVED_KEY) {
      archived.items.push(page)
      continue
    }
    const group = groups.find((g) => g.key === page?.pageType)
    if (group) group.items.push(page)
    else groups[groups.length - 1].items.push(page) // 未知类型归"其他"
  }

  for (const group of [...groups, archived]) {
    group.items.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'zh-Hans-CN'))
  }

  const toPageNode = (page: MemoryWikiTreePage, archivedGroup: boolean): TreeNodeData => ({
    value: page.id,
    label: page.title || '未命名记忆',
    nodeProps: { kind: 'page' satisfies NodeKind, archived: archivedGroup, page } satisfies MemoryWikiNodeProps,
  })

  const nodes: TreeNodeData[] = groups.map((group) => ({
    value: group.key,
    label: group.label,
    children:
      group.items.length > 0
        ? group.items.map((page) => toPageNode(page, false))
        : [
            {
              value: `${group.key}${EMPTY_PLACEHOLDER_SUFFIX}`,
              label: '',
              nodeProps: { kind: 'placeholder' satisfies NodeKind } satisfies MemoryWikiNodeProps,
            },
          ],
    nodeProps: {
      kind: 'group' satisfies NodeKind,
      count: group.items.length,
    } satisfies MemoryWikiNodeProps,
  }))

  // 归档目录为空时不显示
  if (archived.items.length > 0) {
    nodes.push({
      value: archived.key,
      label: archived.label,
      children: archived.items.map((page) => toPageNode(page, true)),
      nodeProps: {
        kind: 'group' satisfies NodeKind,
        count: archived.items.length,
      } satisfies MemoryWikiNodeProps,
    })
  }

  return nodes
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((value, index) => value === sortedB[index])
}

export default function MemoryWikiTree({
  pages,
  selectedId,
  expandedKeys,
  onExpandedChange,
  onSelect,
}: MemoryWikiTreeProps) {
  const treeData = useMemo(() => buildTreeData(pages), [pages])
  const expandedKeysRef = useRef(expandedKeys)
  expandedKeysRef.current = expandedKeys

  const tree = useTree({
    // 受控展开/选中：记录 ↔ 数组互转，保持与旧 localStorage 形状兼容
    expandedState: useMemo(() => Object.fromEntries(expandedKeys.map((key) => [key, true])), [expandedKeys]),
    onExpandedStateChange: (record) => {
      const nextKeys = Object.keys(record).filter((key) => record[key] === true)
      // initialize 会在数据变化时回放完整记录，集合未变化时不上抛，避免渲染循环
      if (sameStringSet(nextKeys, expandedKeysRef.current)) return
      onExpandedChange(nextKeys)
    },
    selectedState: selectedId ? [selectedId] : [],
  })

  const renderNode = ({ node, expanded, selected, elementProps }: RenderTreeNodePayload) => {
    const nodeProps = (node.nodeProps || {}) as MemoryWikiNodeProps

    // 空目录占位行：不可点击、不可选中
    if (nodeProps.kind === 'placeholder') {
      return (
        <Box px={8} py={4}>
          <Text fz="var(--text-sm)" c="dimmed" opacity={0.7}>
            还没有这一类的记忆
          </Text>
        </Box>
      )
    }

    if (nodeProps.kind === 'group') {
      return (
        <UnstyledButton
          {...elementProps}
          onClick={() => tree.toggleExpanded(node.value)}
          w="100%"
          px={8}
          py={6}
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          <Group justify="space-between" gap={6} wrap="nowrap">
            <Group gap={6} wrap="nowrap">
              {expanded ? (
                <IconFolderOpen size={14} stroke={1.7} style={{ flex: '0 0 auto' }} />
              ) : (
                <IconFolder size={14} stroke={1.7} style={{ flex: '0 0 auto' }} />
              )}
              <Text fz="var(--text-base)" fw={600}>
                {node.label}
              </Text>
            </Group>
            {nodeProps.count === 0 ? (
              <Text fz="var(--text-xs)" c="dimmed" opacity={0.7}>
                （空）
              </Text>
            ) : (
              <Badge size="xs" variant="light" color="gray">
                {nodeProps.count}
              </Badge>
            )}
          </Group>
        </UnstyledButton>
      )
    }

    const page = nodeProps.page
    const archived = nodeProps.archived === true
    return (
      <UnstyledButton
        {...elementProps}
        onClick={() => page && onSelect(page)}
        w="100%"
        px={8}
        py={5}
        bg={selected && !archived ? 'var(--color-tint-memory)' : 'transparent'}
        style={{ borderRadius: 'var(--radius-sm)' }}
      >
        <Group gap={6} wrap="nowrap">
          <IconFile
            size={14}
            stroke={1.6}
            style={{ flex: '0 0 auto', opacity: 0.8 }}
            color={archived ? 'var(--color-muted)' : undefined}
          />
          <Text
            fz="var(--text-base)"
            truncate
            fw={selected ? 600 : 400}
            c={archived ? 'dimmed' : selected ? 'brand.7' : undefined}
            opacity={archived && !selected ? 0.8 : 1}
          >
            {node.label}
          </Text>
        </Group>
      </UnstyledButton>
    )
  }

  return (
    <Box h="100%" style={{ overflowY: 'auto' }} px={6} py={8}>
      <Tree
        data={treeData}
        tree={tree}
        renderNode={renderNode}
        // 点击行为全部由 renderNode 自管（目录开合/页面选中），关闭内置点击语义
        expandOnClick={false}
        selectOnClick={false}
        allowRangeSelection={false}
        levelOffset="sm"
      />
    </Box>
  )
}
