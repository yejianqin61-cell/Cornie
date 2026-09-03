import { Badge, Group, Paper, Stack, Text } from '@mantine/core'

// 工具结果面板（React 版 ToolResultPanel.vue）：chat 回复里"已完成的操作"卡片组。
// 多态 result 形状契约保持：ok/error/summary/message/result.message/result.summary、
// tool_name/source_text 与 camelCase 别名双容忍。

export interface ToolResultRecord {
  ok?: boolean
  tool_name?: string
  toolName?: string
  error?: string
  summary?: string
  message?: string
  result?: { message?: string; summary?: string } | null
  source_text?: string
  sourceText?: string
  [key: string]: unknown
}

function getToolName(item: ToolResultRecord): string {
  return item?.tool_name || item?.toolName || ''
}

function getToolLabel(name: string): string {
  if (!name) return '这件小事'
  if (name.includes('ledger')) return '记账'
  if (name.includes('todo')) return '待办'
  if (name.includes('schedule')) return '日程'
  if (name.includes('category')) return '类目'
  if (name.includes('memory')) return '记忆'
  return '这件小事'
}

function getToolTitle(name: string): string {
  if (!name) return '铃湾的处理结果'
  return name.replaceAll('_', ' ').replaceAll('-', ' ')
}

function getSummary(item: ToolResultRecord): string {
  const failed = item?.ok === false
  if (failed) {
    return item?.error || '这次没有顺利处理好'
  }
  if (typeof item?.summary === 'string' && item.summary.trim()) {
    return item.summary
  }
  if (typeof item?.message === 'string' && item.message.trim()) {
    return item.message
  }
  if (item?.result && typeof item.result === 'object') {
    if (typeof item.result.message === 'string' && item.result.message.trim()) {
      return item.result.message
    }
    if (typeof item.result.summary === 'string' && item.result.summary.trim()) {
      return item.result.summary
    }
  }
  return failed ? '这次没有顺利处理好' : '已经帮你处理好了'
}

function getSourceText(item: ToolResultRecord): string {
  if (typeof item?.source_text === 'string' && item.source_text.trim()) {
    return item.source_text
  }
  if (typeof item?.sourceText === 'string' && item.sourceText.trim()) {
    return item.sourceText
  }
  return ''
}

function getCardTitle(item: ToolResultRecord): string {
  return item?.ok === false
    ? `铃湾刚刚处理 ${getToolLabel(getToolName(item))} 时出了点小岔子`
    : `铃湾已经帮你处理好 ${getToolLabel(getToolName(item))} 了`
}

export default function ToolResultPanel({ results }: { results: ToolResultRecord[] }) {
  return (
    <Paper w="100%" p={0} bg="transparent" shadow="0">
      <Stack gap={10}>
        <Text fz="var(--text-sm)" c="dimmed" pl={4}>
          已完成的操作
        </Text>
        {results.map((item, index) => (
          <Paper
            key={`${getToolName(item) || 'tool'}-${index}`}
            p="12px 14px"
            radius="lg"
            bg={item?.ok === false ? 'var(--color-danger-soft)' : 'var(--color-success-soft)'}
          >
            <Stack gap={6}>
              <Group justify="space-between" gap={10}>
                <Group align="flex-start" gap={10} style={{ minWidth: 0 }}>
                  <Text
                    w={24}
                    h={24}
                    fz="var(--text-sm)"
                    fw={700}
                    c="var(--color-text)"
                    bg="var(--color-surface)"
                    style={{
                      borderRadius: 999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: '0 0 auto',
                    }}
                  >
                    {item?.ok === false ? '!' : '✓'}
                  </Text>
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text fz="var(--text-sm)" fw={700} c="var(--color-text)">
                      {getCardTitle(item)}
                    </Text>
                    <Text fz="var(--text-xs)" c="dimmed">
                      {getToolTitle(getToolName(item))}
                    </Text>
                  </Stack>
                </Group>
                <Badge color={item?.ok === false ? 'danger' : 'success'} variant="outline" fz="var(--text-xs)">
                  {item?.ok === false ? '失败' : '完成'}
                </Badge>
              </Group>
              <Text
                fz="var(--text-base)"
                c="var(--color-text)"
                style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              >
                {getSummary(item)}
              </Text>
              {getSourceText(item) ? (
                <Text fz="var(--text-xs)" c="dimmed" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  你刚才说的是：{getSourceText(item)}
                </Text>
              ) : null}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Paper>
  )
}
