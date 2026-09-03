import { Box, Stack, Text } from '@mantine/core'
import { useMemo } from 'react'

import { parseMarkdown, type MarkdownBlock } from '../../lib/markdown'

// Markdown 渲染组件（React 版 CornieDiaryMarkdown.vue）。
// headingLevel：允许渲染的最大标题级别（1-3）；0 时标题全部降级为 div
// （用于摘要/按钮内等非文档场景，避免 button 内嵌套 h1-h3）。

function HeadingNode({ block, headingLevel }: { block: MarkdownBlock; headingLevel: number }) {
  const level = block.level || 0
  if (level === 1 && headingLevel >= 1) {
    return (
      <Text component="h1" fz="1.14rem" fw={800} lh={1.35} m={0}>
        {block.segments}
      </Text>
    )
  }
  if (level === 2 && headingLevel >= 2) {
    return (
      <Text component="h2" fz="1.02rem" fw={800} lh={1.35} m={0}>
        {block.segments}
      </Text>
    )
  }
  if (level === 3 && headingLevel >= 3) {
    return (
      <Text component="h3" fz="0.96rem" fw={800} lh={1.35} m={0}>
        {block.segments}
      </Text>
    )
  }
  return (
    <Text component="div" fw={800} lh={1.35} m={0}>
      {block.segments}
    </Text>
  )
}

export default function CornieDiaryMarkdown({ content, headingLevel = 3 }: { content: string; headingLevel?: number }) {
  const blocks = useMemo(() => parseMarkdown(content), [content])

  return (
    <Stack gap={10} style={{ color: 'inherit' }}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return <HeadingNode key={`heading-${index}`} block={block} headingLevel={headingLevel} />
        }
        if (block.type === 'quote') {
          return (
            <Box
              key={`quote-${index}`}
              component="blockquote"
              m={0}
              p="10px 12px"
              style={{
                borderLeft: '3px solid rgba(155, 107, 122, 0.28)',
                background: 'rgba(255, 255, 255, 0.42)',
                borderRadius: '0 12px 12px 0',
                lineHeight: 1.8,
                color: 'inherit',
              }}
            >
              {block.segments}
            </Box>
          )
        }
        if (block.type === 'list' && block.items) {
          return (
            <Box
              key={`list-${index}`}
              component="ul"
              m={0}
              pl={20}
              style={{ display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.75, listStyle: 'disc outside' }}
            >
              {block.items.map((item, itemIndex) => (
                <Box component="li" key={`list-${index}-${itemIndex}`}>
                  {item}
                </Box>
              ))}
            </Box>
          )
        }
        return (
          <Text key={`p-${index}`} component="p" m={0} lh={1.8}>
            {block.segments}
          </Text>
        )
      })}
    </Stack>
  )
}
