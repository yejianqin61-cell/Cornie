// 高风险确认中心面板（React 版 components/MemoryWikiConfirmationPanel.vue，整行 span2）。
// 状态筛选 + 待确认计数 + ConfirmCard 网格（复用 components/chat/ConfirmCard.tsx）；
// 逐项状态闸门保留：仅 status==='pending' 可点，processing 占位，errorMap 逐项展示。
import { Card, EmptyState, Group, Paper, Select, SimpleGrid, Text } from '@mantine/core'
import { IconShieldCheck } from '@tabler/icons-react'

import ConfirmCard, { type ConfirmRequest } from '../chat/ConfirmCard'
import type { MemoryWikiConfirmation } from '../../hooks/useMemoryWikiWorkspace'

const STATUS_SELECT_DATA = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: 'pending' },
  { value: 'approved', label: 'approved' },
  { value: 'rejected', label: 'rejected' },
]

interface MemoryWikiConfirmationPanelProps {
  confirmations: MemoryWikiConfirmation[]
  filterStatus: string
  onFilterStatusChange: (value: string) => void
  pendingCount: number
  statusMap: Record<string, string>
  errorMap: Record<string, string>
  onConfirm: (confirmation: MemoryWikiConfirmation) => void
  onReject: (confirmation: MemoryWikiConfirmation) => void
}

export default function MemoryWikiConfirmationPanel({
  confirmations,
  filterStatus,
  onFilterStatusChange,
  pendingCount,
  statusMap,
  errorMap,
  onConfirm,
  onReject,
}: MemoryWikiConfirmationPanelProps) {
  return (
    <Card p="16px" withBorder>
      <Group justify="space-between" align="flex-start" gap={8} wrap="wrap">
        <Text fw={700}>高风险确认中心</Text>
        <Select
          w={140}
          size="sm"
          allowDeselect={false}
          data={STATUS_SELECT_DATA}
          value={filterStatus}
          onChange={(value) => onFilterStatusChange(value || '')}
        />
      </Group>

      <Paper px={14} py={12} radius="md" bg="var(--color-surface-2)" mt={12}>
        <Text fz="var(--text-base)" c="dimmed">
          当前待确认{' '}
          <Text component="span" fw={700} c="var(--color-text)">
            {pendingCount}
          </Text>{' '}
          项
        </Text>
      </Paper>

      {confirmations.length > 0 ? (
        <SimpleGrid mt={12} spacing={12} minColWidth={280}>
          {confirmations.map((confirmation) => {
            // 逐项状态：乐观 statusMap 覆盖服务端 status（失败置 'failed'）
            const status = statusMap[confirmation.id] || confirmation.status || 'pending'
            return (
              <ConfirmCard
                key={confirmation.id}
                request={(confirmation.confirmRequest || {}) as ConfirmRequest}
                status={status}
                errorMessage={errorMap[confirmation.id] || ''}
                onConfirm={() => onConfirm(confirmation)}
                onReject={() => onReject(confirmation)}
              />
            )
          })}
        </SimpleGrid>
      ) : (
        <EmptyState size="sm" mt={8} icon={<IconShieldCheck size={24} stroke={1.5} />} title="暂无待确认动作" />
      )}
    </Card>
  )
}
