// 页面列表卡（React 版 components/MemoryWikiPageListPanel.vue）：类型/状态筛选 + 页面行 + 空态。
import { Badge, Box, Card, EmptyState, Group, Select, Stack, Text, UnstyledButton } from '@mantine/core'
import { IconFileText } from '@tabler/icons-react'

import type { MemoryWikiPage } from '../../api'
import { MEMORY_PAGE_STATUS_OPTIONS, MEMORY_PAGE_TYPE_OPTIONS } from '../../hooks/useMemoryWikiWorkspace'

const TYPE_SELECT_DATA = [
  { value: '', label: '全部类型' },
  ...MEMORY_PAGE_TYPE_OPTIONS.map((value) => ({ value, label: value })),
]

const STATUS_SELECT_DATA = [
  { value: '', label: '全部状态' },
  ...MEMORY_PAGE_STATUS_OPTIONS.map((value) => ({ value, label: value })),
]

interface MemoryWikiPageListPanelProps {
  pages: MemoryWikiPage[]
  selectedPageId: string
  filterType: string
  filterStatus: string
  onSelectPage: (pageId: string) => void
  onFilterTypeChange: (value: string) => void
  onFilterStatusChange: (value: string) => void
}

export default function MemoryWikiPageListPanel({
  pages,
  selectedPageId,
  filterType,
  filterStatus,
  onSelectPage,
  onFilterTypeChange,
  onFilterStatusChange,
}: MemoryWikiPageListPanelProps) {
  return (
    <Card p="16px" withBorder style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <Group justify="space-between" align="flex-start" gap={8} wrap="wrap">
        <Text fw={700}>记忆页面</Text>
        <Group gap={8} wrap="wrap">
          <Select
            w={150}
            size="sm"
            allowDeselect={false}
            data={TYPE_SELECT_DATA}
            value={filterType}
            onChange={(value) => onFilterTypeChange(value || '')}
          />
          <Select
            w={140}
            size="sm"
            allowDeselect={false}
            data={STATUS_SELECT_DATA}
            value={filterStatus}
            onChange={(value) => onFilterStatusChange(value || '')}
          />
        </Group>
      </Group>

      {pages.length === 0 ? (
        <EmptyState size="sm" icon={<IconFileText size={24} stroke={1.5} />} title="暂无记忆页面" />
      ) : (
        <Stack gap={8} style={{ overflowY: 'auto', minHeight: 0 }}>
          {pages.map((page) => {
            const active = page.pageId === selectedPageId
            return (
              <UnstyledButton
                key={page.pageId}
                onClick={() => onSelectPage(page.pageId)}
                px={14}
                py={12}
                w="100%"
                bg={active ? 'var(--color-tint-memory)' : 'transparent'}
                style={{ borderRadius: 'var(--radius-lg)', textAlign: 'left' }}
              >
                <Group justify="space-between" gap={12} wrap="nowrap">
                  <Box style={{ minWidth: 0 }}>
                    <Text fw={700} truncate>
                      {page.title || page.pageId}
                    </Text>
                    <Text fz="var(--text-sm)" c="dimmed" mt={4} truncate>
                      {page.pageType ?? 'unknown'} · {page.status ?? 'unknown'} · {String(page.importance ?? 'unknown')}
                    </Text>
                  </Box>
                  {active ? (
                    <Badge size="sm" variant="light" color="brand" style={{ flex: '0 0 auto' }}>
                      当前
                    </Badge>
                  ) : null}
                </Group>
              </UnstyledButton>
            )
          })}
        </Stack>
      )}
    </Card>
  )
}
