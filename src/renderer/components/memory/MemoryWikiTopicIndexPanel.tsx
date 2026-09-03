// Topic 索引面板（React 版 components/MemoryWikiTopicIndexPanel.vue，整行 span2）。
// 左列表（keyword + heat/pages），右详情（索引键/热度/日期/关联页面 + 来源摘要）；
// 别名以逗号分隔串受控编辑（旧 defineModel(topicDetail) → onTopicDetailChange(patch)）。
import { Box, Button, Card, EmptyState, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { IconLink, IconSearch } from '@tabler/icons-react'

import type { TopicDetail, TopicIndexItem, TopicSourceTrace } from '../../hooks/useMemoryWikiWorkspace'

interface MemoryWikiTopicIndexPanelProps {
  topicItems: TopicIndexItem[]
  selectedTopicKey: string
  topicDetail: TopicDetail | null
  onTopicDetailChange: (patch: Partial<TopicDetail>) => void
  topicSourceTrace: TopicSourceTrace | null
  saving: boolean
  onSelectTopic: (normalizedKey: string) => void
  onSaveTopicAliases: () => void
}

export default function MemoryWikiTopicIndexPanel({
  topicItems,
  selectedTopicKey,
  topicDetail,
  onTopicDetailChange,
  topicSourceTrace,
  saving,
  onSelectTopic,
  onSaveTopicAliases,
}: MemoryWikiTopicIndexPanelProps) {
  return (
    <Card p="16px" withBorder>
      <Text fw={700} mb={12}>
        Topic Index
      </Text>

      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)',
          gap: 14,
          minHeight: 0,
        }}
      >
        {topicItems.length === 0 ? (
          <EmptyState size="sm" icon={<IconLink size={24} stroke={1.5} />} title="暂无主题索引" />
        ) : (
          <Stack gap={8} style={{ overflowY: 'auto', maxHeight: 360 }}>
            {topicItems.map((item) => {
              const active = item.normalizedKey === selectedTopicKey
              return (
                <UnstyledButton
                  key={item.normalizedKey}
                  onClick={() => onSelectTopic(item.normalizedKey)}
                  px={14}
                  py={12}
                  w="100%"
                  bg={active ? 'var(--color-tint-memory)' : 'transparent'}
                  style={{ borderRadius: 'var(--radius-lg)', textAlign: 'left' }}
                >
                  <Text fw={700} truncate>
                    {item.keyword || item.normalizedKey}
                  </Text>
                  <Text fz="var(--text-sm)" c="dimmed" mt={4} truncate>
                    heat {item.heatScore ?? 0} · {item.pageIds?.length || 0} pages
                  </Text>
                </UnstyledButton>
              )
            })}
          </Stack>
        )}

        {topicDetail ? (
          <Stack gap={10}>
            <Text fz="var(--text-xl)" fw={800}>
              {topicDetail.keyword || topicDetail.normalizedKey}
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              索引键：{topicDetail.normalizedKey}
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              主题热度：{topicDetail.heatScore ?? 0}
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              相关日期：{(topicDetail.dates ?? []).join(', ') || '无'}
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              关联页面：
              {(() => {
                // pageIds / memoryPageIds 双字段兼容（pageIds/memoryPageIds 均为数组形状）
                const rawIds = topicDetail.pageIds ?? topicDetail.memoryPageIds
                const ids = Array.isArray(rawIds) ? rawIds.map(String) : []
                return ids.join(', ') || '无'
              })()}
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              聊天来源：{(topicSourceTrace?.chatSources ?? []).map((item) => item.date).join(', ') || '无'}
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              观察来源：
              {(topicSourceTrace?.observationSources ?? []).map((item) => item.title).join(', ') || '无'}
            </Text>
            <Stack gap={6} mt={6}>
              <Text fz="var(--text-base)">别名（逗号分隔）</Text>
              <TextInput
                value={topicDetail.aliasesText}
                onChange={(event) => onTopicDetailChange({ aliasesText: event.currentTarget.value })}
              />
              <Button loading={saving} w="fit-content" onClick={onSaveTopicAliases}>
                {saving ? '保存中…' : '保存主题别名'}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <EmptyState size="sm" icon={<IconSearch size={24} stroke={1.5} />} title="选择主题查看详情" />
        )}
      </Box>
    </Card>
  )
}
