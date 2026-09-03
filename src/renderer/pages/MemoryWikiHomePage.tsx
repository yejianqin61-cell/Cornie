// 记忆 Wiki 前台双栏容器（React 版 components/MemoryWikiHome.vue，路由 /memory）。
// 左 260px 树 + 右正文：active/archived 各 limit=500 两次拉取合并、220ms 防抖搜索、
// localStorage 持久化选中与展开（key: cornie.memory-wiki.tree）、listenDataChanged(memory) 自动刷新。
// 注：右栏旧 MemoryPageDetail（规格 §1.2 清单外）尚未重写——选中页暂以只读摘要预览呈现，
// 「新建记忆」进入占位空态；读写编辑器接入后替换右栏即可，容器状态机不变。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Box, Button, EmptyState, Group, Paper, Skeleton, Stack, Text, TextInput } from '@mantine/core'
import { IconBook2, IconFilePlus, IconSearch } from '@tabler/icons-react'

import { listMemoryWikiPages, type MemoryWikiPage } from '../api'
import { listenDataChanged } from '../syncSignals'
import { useDebouncedValue } from '../hooks/useTimers'
import { useRequestGuard } from '../hooks/useRequestGuard'
import MemoryWikiTree, { type MemoryWikiTreePage } from '../components/memory/MemoryWikiTree'

const STORAGE_KEY = 'cornie.memory-wiki.tree'

interface StoredTreeState {
  selectedId?: unknown
  expanded?: unknown
}

function readStoredTreeState(): StoredTreeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredTreeState
  } catch {
    // localStorage 不可用时静默
  }
  return {}
}

const DEFAULT_EXPANDED_KEYS = ['identity_profile', 'identity_person', 'identity_preference', 'identity_trait']

function matchesSearch(page: MemoryWikiPage, keyword: string): boolean {
  return [page.title, page.aliasesText, page.summary]
    .filter(Boolean)
    .some((text) => String(text).toLowerCase().includes(keyword))
}

export default function MemoryWikiHomePage() {
  const wikiGuard = useRequestGuard()

  const storedState = useMemo(readStoredTreeState, [])
  const [pages, setPages] = useState<MemoryWikiPage[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [selectedId, setSelectedId] = useState(typeof storedState.selectedId === 'string' ? storedState.selectedId : '')
  const [creating, setCreating] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<string[]>(
    Array.isArray(storedState.expanded) && storedState.expanded.length > 0
      ? (storedState.expanded as string[])
      : DEFAULT_EXPANDED_KEYS
  )

  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId

  // T-03：树顶搜索 220ms 防抖（组件卸载自动清理）
  useDebouncedValue(searchQuery, 220, (value) => {
    setAppliedQuery(
      String(value ?? '')
        .trim()
        .toLowerCase()
    )
  })

  // 选中/展开持久化（与旧版 key 兼容）
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedId, expanded: expandedKeys }))
    } catch {
      // 忽略写入失败
    }
  }, [selectedId, expandedKeys])

  const refresh = useCallback(async (): Promise<void> => {
    const { token } = wikiGuard.begin('refresh')
    setLoading(true)
    try {
      const [activeData, archivedData] = await Promise.all([
        listMemoryWikiPages({ status: 'active', limit: 500, offset: 0 }),
        listMemoryWikiPages({ status: 'archived', limit: 500, offset: 0 }),
      ])
      if (!wikiGuard.isCurrent('refresh', token)) return
      const merged = [...(activeData.pages || []), ...(archivedData.pages || [])]
      setPages(merged)
      // 选中页被删除/归档移除后清空选中
      setSelectedId((prev) => (prev && merged.some((page) => page.id === prev) ? prev : ''))
    } catch {
      // 树加载失败静默为空态（与旧版一致；规格 §6.5 的错误呈现统一由后续迭代收口）
    } finally {
      if (wikiGuard.isCurrent('refresh', token)) {
        setLoading(false)
        wikiGuard.end('refresh', token)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void refresh()
    const stopListening = listenDataChanged((detail) => {
      if ((detail as { memory?: boolean } | null)?.memory) void refresh()
    })
    return () => {
      stopListening()
    }
  }, [refresh])

  const isSearching = searchQuery.trim().length > 0
  const filteredPages = useMemo(() => {
    if (!appliedQuery) return pages
    return pages.filter((page) => matchesSearch(page, appliedQuery))
  }, [pages, appliedQuery])
  const searchNoResult = isSearching && filteredPages.length === 0

  const selectedPage = useMemo(() => pages.find((page) => page.id === selectedId) ?? null, [pages, selectedId])

  const handleSelectPage = (page: MemoryWikiTreePage) => {
    setSelectedId(page.id)
    setCreating(false)
  }

  return (
    <Stack gap={12} h="100%" style={{ overflow: 'hidden' }}>
      {/* 头部：标题 + 搜索 + 新建 */}
      <Group justify="space-between" align="center" gap={12} wrap="wrap">
        <Text fz="var(--text-xl)" fw={800}>
          记忆 Wiki
        </Text>
        <Group gap={10} wrap="wrap">
          <TextInput
            w={220}
            size="sm"
            placeholder="搜索记忆…"
            leftSection={<IconSearch size={14} stroke={1.7} />}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
          />
          <Button
            size="sm"
            leftSection={<IconFilePlus size={16} stroke={1.8} />}
            onClick={() => {
              setCreating(true)
              setSelectedId('')
            }}
          >
            新建记忆
          </Button>
        </Group>
      </Group>

      {/* 双栏：左树 + 右正文 */}
      <Box style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 12 }}>
        <Box style={{ minHeight: 0, overflow: 'hidden' }}>
          {loading ? (
            <Stack gap={8} p={16}>
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} h={14} w={`${80 - index * 8}%`} radius="sm" />
              ))}
            </Stack>
          ) : (
            <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
              {isSearching ? (
                <Text fz="var(--text-sm)" c="dimmed" px={12} py={8}>
                  {searchNoResult ? '没有找到相关的记忆' : `搜索结果：${filteredPages.length} 条`}
                </Text>
              ) : null}
              {searchNoResult ? (
                <Text fz="var(--text-base)" c="dimmed" ta="center" py={20} px={12}>
                  换个关键词试试。
                </Text>
              ) : (
                <MemoryWikiTree
                  pages={filteredPages}
                  selectedId={selectedId}
                  expandedKeys={expandedKeys}
                  onExpandedChange={setExpandedKeys}
                  onSelect={handleSelectPage}
                />
              )}
            </Stack>
          )}
        </Box>

        <Box style={{ minHeight: 0, overflowY: 'auto' }}>
          {creating ? (
            <EmptyState
              h="100%"
              icon={<IconFilePlus size={28} stroke={1.5} />}
              title="新建记忆"
              description="编辑视图尚未迁移：可先在「设置 → 高级设置 → 记忆治理工作台」新建页面。"
            />
          ) : selectedId && selectedPage ? (
            <Stack gap={12}>
              <Group justify="space-between" align="flex-start" gap={10} wrap="wrap">
                <Text fz="var(--text-xl)" fw={800}>
                  {selectedPage.title || '未命名记忆'}
                </Text>
                <Group gap={6} wrap="wrap">
                  <Badge size="sm" variant="light" color="brand">
                    {selectedPage.pageType ?? 'unknown'}
                  </Badge>
                  <Badge size="sm" variant="light" color={selectedPage.status === 'archived' ? 'gray' : 'success'}>
                    {selectedPage.status ?? 'unknown'}
                  </Badge>
                  <Badge size="sm" variant="light" color="gray">
                    {String(selectedPage.importance ?? 'unknown')}
                  </Badge>
                </Group>
              </Group>
              {selectedPage.summary ? (
                <Text fz="var(--text-base)" c="dimmed" lh={1.6}>
                  {selectedPage.summary}
                </Text>
              ) : null}
              {selectedPage.body ? (
                <Paper p={16} radius="md" bg="var(--color-surface-2)">
                  <Text fz="var(--text-base)" lh={1.7} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {selectedPage.body}
                  </Text>
                </Paper>
              ) : (
                <Text fz="var(--text-base)" c="dimmed">
                  这页还没有正文。
                </Text>
              )}
              <Text fz="var(--text-xs)" c="dimmed">
                更新于 {selectedPage.updatedAt || '未知时间'} · 完整编辑能力在治理工作台
              </Text>
            </Stack>
          ) : (
            <EmptyState h="100%" icon={<IconBook2 size={28} stroke={1.5} />} title="选择左侧记忆查看" />
          )}
        </Box>
      </Box>
    </Stack>
  )
}
