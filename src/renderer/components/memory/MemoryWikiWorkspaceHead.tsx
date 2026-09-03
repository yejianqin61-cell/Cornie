// 工作台头（React 版 components/MemoryWikiWorkspaceHead.vue）：标题 +「运行巡检入池」「刷新全部」。
import { Button, Group, Text } from '@mantine/core'
import { IconRadar, IconRefresh } from '@tabler/icons-react'

interface MemoryWikiWorkspaceHeadProps {
  loading: boolean
  saving: boolean
  onRunInspection: () => void
  onRefresh: () => void
}

export default function MemoryWikiWorkspaceHead({
  loading,
  saving,
  onRunInspection,
  onRefresh,
}: MemoryWikiWorkspaceHeadProps) {
  return (
    <Group justify="space-between" align="flex-start" gap={12} wrap="wrap">
      <Text fz="var(--text-2xl)" fw={800}>
        Memory Wiki 工作台
      </Text>
      <Group gap={10} wrap="wrap">
        <Button leftSection={<IconRadar size={16} stroke={1.8} />} disabled={saving} onClick={onRunInspection}>
          {saving ? '处理中…' : '运行巡检入池'}
        </Button>
        <Button
          variant="default"
          leftSection={<IconRefresh size={16} stroke={1.8} />}
          disabled={loading}
          onClick={onRefresh}
        >
          {loading ? '刷新中…' : '刷新全部'}
        </Button>
      </Group>
    </Group>
  )
}
