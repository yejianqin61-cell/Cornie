// 版本历史与回滚面板（React 版 components/MemoryWikiVersionPanel.vue，整行 span2）。
// 左版本列表（点击即拉 diff），右已选版本详情；diff 按契约只呈现后端 5 个布尔标志
// （title/summary/body/status/importance），字段级变化用 Badge 色块，不自写 diff 算法。
import { Badge, Box, Card, EmptyState, Paper, Stack, Table, Text, UnstyledButton } from '@mantine/core'
import { IconClock, IconHistory, IconBooks } from '@tabler/icons-react'

import type { PageVersionItem, VersionDiff } from '../../hooks/useMemoryWikiWorkspace'

interface MemoryWikiVersionPanelProps {
  pageId: string
  pageVersions: PageVersionItem[]
  selectedVersionId: string
  selectedVersion: PageVersionItem | null
  versionDiff: VersionDiff | null
  onSelectVersion: (versionId: string) => void
}

const DIFF_FIELDS: Array<{ label: string; key: keyof VersionDiff }> = [
  { label: '标题', key: 'titleChanged' },
  { label: '摘要', key: 'summaryChanged' },
  { label: '正文', key: 'bodyChanged' },
  { label: '状态', key: 'statusChanged' },
  { label: '重要性', key: 'importanceChanged' },
]

export default function MemoryWikiVersionPanel({
  pageId,
  pageVersions,
  selectedVersionId,
  selectedVersion,
  versionDiff,
  onSelectVersion,
}: MemoryWikiVersionPanelProps) {
  if (!pageId) {
    return (
      <Card p="16px" withBorder>
        <EmptyState size="sm" icon={<IconBooks size={24} stroke={1.5} />} title="先选择一个记忆页面" />
      </Card>
    )
  }

  return (
    <Card p="16px" withBorder>
      <Text fw={700} mb={12}>
        版本历史与回滚
      </Text>

      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 360px) minmax(0, 1fr)',
          gap: 14,
          minHeight: 0,
        }}
      >
        {pageVersions.length === 0 ? (
          <EmptyState size="sm" icon={<IconClock size={24} stroke={1.5} />} title="暂无历史版本" />
        ) : (
          <Stack gap={8} style={{ overflowY: 'auto', maxHeight: 420 }}>
            {pageVersions.map((item) => {
              const active = item.versionId === selectedVersionId
              return (
                <UnstyledButton
                  key={item.versionId}
                  onClick={() => onSelectVersion(item.versionId)}
                  px={14}
                  py={12}
                  w="100%"
                  bg={active ? 'var(--color-tint-memory)' : 'transparent'}
                  style={{ borderRadius: 'var(--radius-lg)', textAlign: 'left' }}
                >
                  <Text fw={700} truncate>
                    {item.reason || 'snapshot'}
                  </Text>
                  <Text fz="var(--text-sm)" c="dimmed" mt={4} truncate>
                    {item.versionId} · {item.createdAt || '未知时间'}
                  </Text>
                </UnstyledButton>
              )
            })}
          </Stack>
        )}

        {selectedVersion ? (
          <Stack gap={10}>
            <Text fz="var(--text-xl)" fw={800}>
              已选版本
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              版本 ID：{selectedVersion.versionId}
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              快照原因：{selectedVersion.reason || 'snapshot'}
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              创建时间：{selectedVersion.createdAt || '未知时间'}
            </Text>

            {versionDiff ? (
              <Stack gap={10} mt={6}>
                <Text fz="var(--text-base)" fw={700}>
                  版本摘要（对比当前页面）
                </Text>
                <Table verticalSpacing="xs" w={320} withTableBorder={false}>
                  <Table.Tbody>
                    {DIFF_FIELDS.map((field) => {
                      const changed = versionDiff[field.key] === true
                      return (
                        <Table.Tr key={field.key}>
                          <Table.Td>{field.label}</Table.Td>
                          <Table.Td>
                            {changed ? (
                              <Badge size="sm" variant="filled" color="brand">
                                有变更
                              </Badge>
                            ) : (
                              <Badge size="sm" variant="light" color="gray">
                                无变更
                              </Badge>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      )
                    })}
                  </Table.Tbody>
                </Table>
                <Paper px={12} py={10} radius="md" bg="var(--color-surface-2)">
                  <Text fz="var(--text-sm)" style={{ whiteSpace: 'pre-wrap' }}>
                    回滚后将把当前页面恢复到这个历史快照。
                  </Text>
                </Paper>
              </Stack>
            ) : null}
          </Stack>
        ) : (
          <EmptyState size="sm" icon={<IconHistory size={24} stroke={1.5} />} title="选择版本查看详情" />
        )}
      </Box>
    </Card>
  )
}
