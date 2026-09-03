import { Paper, Stack, Text } from '@mantine/core'

// 追问气泡（React 版 AskBackBubble.vue）：策略引擎 ask_back 决策上屏。
// FE-10：配色对齐全局暖色主题（brand.0 = accent 6% 混白底，与旧 color-mix 等价）。

export default function AskBackBubble({ question, reason }: { question: string; reason?: string }) {
  return (
    <Paper w="100%" p="10px 12px" radius="lg" bg="brand.0" shadow="0">
      <Stack gap={4}>
        <Text fz="var(--text-xs)" c="dimmed">
          Cornie 还想确认一下
        </Text>
        <Text fz="var(--text-sm)" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {question}
        </Text>
        {reason ? (
          <Text fz="var(--text-xs)" c="dimmed" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            <span style={{ color: 'inherit' }}>原因：</span>
            {reason}
          </Text>
        ) : null}
      </Stack>
    </Paper>
  )
}
