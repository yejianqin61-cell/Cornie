// 治理队列卡（React 版 components/MemoryWikiGovernanceQueuePanel.vue）：
// 状态/分区两个筛选（分区选项来自现有 items 的 queueSection 去重）+ 待处理计数 + 筛选摘要 + 请求行。
import { Card, EmptyState, Group, Paper, Select, Stack, Text, UnstyledButton } from '@mantine/core'
import { IconCompass } from '@tabler/icons-react'

import type { GovernanceQueueItem } from '../../hooks/useMemoryWikiWorkspace'

const STATUS_SELECT_DATA = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: 'pending' },
  { value: 'approved', label: 'approved' },
  { value: 'rejected', label: 'rejected' },
  { value: 'deferred', label: 'deferred' },
]

interface MemoryWikiGovernanceQueuePanelProps {
  governanceItems: GovernanceQueueItem[]
  selectedGovernanceId: string
  filterStatus: string
  filterSection: string
  sections: string[]
  pendingCount: number
  filterSummary: string
  onSelectGovernance: (requestId: string) => void
  onFilterStatusChange: (value: string) => void
  onFilterSectionChange: (value: string) => void
}

export default function MemoryWikiGovernanceQueuePanel({
  governanceItems,
  selectedGovernanceId,
  filterStatus,
  filterSection,
  sections,
  pendingCount,
  filterSummary,
  onSelectGovernance,
  onFilterStatusChange,
  onFilterSectionChange,
}: MemoryWikiGovernanceQueuePanelProps) {
  return (
    <Card p="16px" withBorder style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <Group justify="space-between" align="flex-start" gap={8} wrap="wrap">
        <Text fw={700}>治理待审核区</Text>
        <Group gap={8} wrap="wrap">
          <Select
            w={140}
            size="sm"
            allowDeselect={false}
            data={STATUS_SELECT_DATA}
            value={filterStatus}
            onChange={(value) => onFilterStatusChange(value || '')}
          />
          <Select
            w={140}
            size="sm"
            allowDeselect={false}
            data={[
              { value: '', label: '全部分区' },
              ...sections.map((section) => ({ value: section, label: section })),
            ]}
            value={filterSection}
            onChange={(value) => onFilterSectionChange(value || '')}
          />
        </Group>
      </Group>

      <Paper px={14} py={12} radius="md" bg="var(--color-surface-2)">
        <Text fz="var(--text-base)" c="dimmed">
          当前待处理{' '}
          <Text component="span" fw={700} c="var(--color-text)">
            {pendingCount}
          </Text>{' '}
          项
        </Text>
      </Paper>

      <Paper px={14} py={12} radius="md" bg="var(--color-info-soft)">
        <Text fz="var(--text-base)">当前筛选：{filterSummary}</Text>
      </Paper>

      {governanceItems.length === 0 ? (
        <EmptyState size="sm" icon={<IconCompass size={24} stroke={1.5} />} title="暂无治理建议" />
      ) : (
        <Stack gap={8} style={{ overflowY: 'auto', minHeight: 0 }}>
          {governanceItems.map((item) => {
            const active = item.requestId === selectedGovernanceId
            return (
              <UnstyledButton
                key={item.requestId}
                onClick={() => onSelectGovernance(item.requestId)}
                px={14}
                py={12}
                w="100%"
                bg={active ? 'var(--color-tint-memory)' : 'transparent'}
                style={{ borderRadius: 'var(--radius-lg)', textAlign: 'left' }}
              >
                <Text fw={700} truncate>
                  {item.title || item.requestType || item.requestId}
                </Text>
                <Text fz="var(--text-sm)" c="dimmed" mt={4} truncate>
                  {item.queueSection ?? 'unknown'} · {item.status ?? 'unknown'} · {item.riskLevel ?? 'unknown'}
                </Text>
              </UnstyledButton>
            )
          })}
        </Stack>
      )}
    </Card>
  )
}
