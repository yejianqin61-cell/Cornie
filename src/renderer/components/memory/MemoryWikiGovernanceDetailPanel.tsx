// 治理详情卡（React 版 components/MemoryWikiGovernanceDetailPanel.vue）：
// 徽标行 + 2 列 meta + reason + payload 建议动作 + evidence pretty-JSON；
// 动作照旧 disabled 语义；「驳回建议」补 Mantine Modal 二次确认（规格 §6.4 建议）。
import { useState } from 'react'
import { Badge, Box, Button, Card, EmptyState, Group, Modal, Paper, SimpleGrid, Stack, Text } from '@mantine/core'
import { IconClipboardList } from '@tabler/icons-react'

import type { GovernanceDetail, GovernanceEvidenceView } from '../../hooks/useMemoryWikiWorkspace'

interface MemoryWikiGovernanceDetailPanelProps {
  detail: GovernanceDetail | null
  evidenceItems: GovernanceEvidenceView[]
  suggestedActions: string[]
  filterSummary: string
  saving: boolean
  onApprove: () => void
  onDefer: () => void
  onReject: () => void
}

export default function MemoryWikiGovernanceDetailPanel({
  detail,
  evidenceItems,
  suggestedActions,
  filterSummary,
  saving,
  onApprove,
  onDefer,
  onReject,
}: MemoryWikiGovernanceDetailPanelProps) {
  const [pendingReject, setPendingReject] = useState(false)

  if (!detail) {
    return (
      <Card p="16px" withBorder>
        <EmptyState size="sm" icon={<IconClipboardList size={24} stroke={1.5} />} title="选择治理请求查看详情" />
      </Card>
    )
  }

  const status = detail.status ?? 'unknown'

  return (
    <Card p="16px" withBorder>
      <Stack gap={14}>
        <Text fz="var(--text-xl)" fw={800}>
          {detail.title || detail.requestType || detail.requestId}
        </Text>

        <Group gap={8} wrap="wrap">
          <Badge variant="light" color="gray">
            建议
          </Badge>
          <Badge variant="light" color={status === 'pending' ? 'brand' : 'gray'}>
            {status}
          </Badge>
          <Badge variant="light" color={detail.riskLevel === 'high' ? 'danger' : 'gray'}>
            {detail.riskLevel || 'unknown risk'}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={10}>
          {[
            { label: '状态', value: status },
            { label: '来源', value: detail.triggerSource || 'unknown' },
            { label: '分区', value: detail.queueSection || 'unknown' },
            { label: '页面', value: (detail.pageIds ?? []).join(', ') || '无' },
            { label: '主题', value: (detail.topicKeys ?? []).join(', ') || '无' },
            { label: '筛选视角', value: filterSummary },
          ].map((meta) => (
            <Paper key={meta.label} py={12} px={0} bg="transparent" radius="md">
              <Text fz="var(--text-xs)" c="dimmed">
                {meta.label}
              </Text>
              <Text fz="var(--text-base)" mt={6} style={{ overflowWrap: 'anywhere' }}>
                {meta.value}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>

        <Stack gap={6}>
          <Text fz="var(--text-base)" fw={700}>
            为什么建议这样处理
          </Text>
          <Text fz="var(--text-base)" style={{ whiteSpace: 'pre-wrap' }}>
            {detail.reason || '暂无原因说明'}
          </Text>
        </Stack>

        <Stack gap={6}>
          <Text fz="var(--text-base)" fw={700}>
            建议动作
          </Text>
          {suggestedActions.length > 0 ? (
            <Stack gap={8}>
              {suggestedActions.map((item) => (
                <Paper key={item} px={12} py={10} radius="md" bg="var(--color-surface-2)">
                  <Text fz="var(--text-base)" style={{ overflowWrap: 'anywhere' }}>
                    {item}
                  </Text>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text fz="var(--text-base)" c="dimmed">
              当前没有额外的建议动作参数。
            </Text>
          )}
        </Stack>

        <Stack gap={10}>
          <Text fz="var(--text-base)" fw={700}>
            证据与依据
          </Text>
          {evidenceItems.length > 0 ? (
            <Stack gap={10}>
              {evidenceItems.map((item) => (
                <Stack key={item.id} gap={6}>
                  <Text fz="var(--text-sm)" fw={700}>
                    {item.summary}
                  </Text>
                  <Box
                    component="pre"
                    fz="var(--text-sm)"
                    px={12}
                    py={12}
                    m={0}
                    bg="var(--color-surface-2)"
                    style={{
                      borderRadius: 'var(--radius-md)',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      overflow: 'auto',
                      color: 'var(--color-text)',
                    }}
                  >
                    {item.body}
                  </Box>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Text fz="var(--text-base)" c="dimmed">
              这条治理建议当前没有附带更多证据。
            </Text>
          )}
        </Stack>

        <Group gap={10} wrap="wrap">
          <Button disabled={saving || status === 'approved'} onClick={onApprove}>
            标记已处理
          </Button>
          <Button variant="default" disabled={saving || status === 'deferred'} onClick={onDefer}>
            稍后再看
          </Button>
          <Button
            variant="subtle"
            color="danger"
            disabled={saving || status === 'rejected'}
            onClick={() => setPendingReject(true)}
          >
            驳回建议
          </Button>
        </Group>
      </Stack>

      {/* 驳回二次确认（规格 §6.4：治理审核建议对 reject 补确认） */}
      <Modal opened={pendingReject} onClose={() => setPendingReject(false)} title="驳回治理建议" size={420}>
        <Stack gap="md">
          <Text fz="var(--text-base)">
            确定驳回「{detail.title || detail.requestType}」这条治理建议吗？驳回后不会再进入待审核队列。
          </Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="subtle" onClick={() => setPendingReject(false)}>
              再想想
            </Button>
            <Button
              color="danger"
              loading={saving}
              onClick={() => {
                setPendingReject(false)
                onReject()
              }}
            >
              确认驳回
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  )
}
