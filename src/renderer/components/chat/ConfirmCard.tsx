import { Button, Group, Paper, Stack, Text, Badge } from '@mantine/core'

import type { ReactNode } from 'react'

// 确认卡（React 版 ConfirmCard.vue）：策略引擎的 confirm 请求上屏卡片。
// 多态 request 形状推断契约保持一致：专有 kind（类目创建/映射）+ 通用 payload/arguments，
// tool_name/toolName camelCase/snake_case 双容忍。

export interface ConfirmRequest {
  title?: string
  kind?: string
  tool_name?: string
  toolName?: string
  reason?: string
  details?: Array<string | null>
  domain?: string
  proposedCategoryName?: string
  recommendedCategory?: { name?: string } | null
  similarCandidates?: Array<{ name?: string } | null>
  pendingAction?: { toolName?: string } | null
  payload?: Record<string, unknown>
  arguments?: Record<string, unknown>
  [key: string]: unknown
}

function getTitle(request: ConfirmRequest): string {
  if (request?.title) return request.title
  if (request?.kind === 'category_creation_confirmation') return '确认新建这个类目'
  if (request?.kind === 'category_mapping_confirmation') return '确认改用这个类目'
  if (request?.tool_name) return `继续执行 ${request.tool_name}？`
  if (request?.toolName) return `继续执行 ${request.toolName}？`
  return '需要你确认'
}

function getReason(request: ConfirmRequest): string {
  return request?.reason || '需要你确认后继续'
}

function getDetails(request: ConfirmRequest): string[] {
  if (Array.isArray(request?.details) && request.details.length > 0) {
    return request.details.filter((item): item is string => typeof item === 'string' && item.length > 0)
  }

  if (request?.kind === 'category_creation_confirmation') {
    return [
      `所属领域：${request.domain || '未提供'}`,
      `建议类目：${request.proposedCategoryName || '未提供'}`,
      // 触发动作双容忍：pendingAction.toolName / toolName / tool_name
      `触发动作：${request.pendingAction?.toolName || request.toolName || request.tool_name || '未提供'}`,
    ]
  }

  if (request?.kind === 'category_mapping_confirmation') {
    const candidates = Array.isArray(request?.similarCandidates)
      ? request.similarCandidates.map((item) => item?.name).filter(Boolean)
      : []
    return [
      `所属领域：${request.domain || '未提供'}`,
      `推荐类目：${request.recommendedCategory?.name || '未提供'}`,
      candidates.length > 0 ? `可选候选：${candidates.join('、')}` : null,
      `触发动作：${request.pendingAction?.toolName || request.toolName || request.tool_name || '未提供'}`,
    ].filter((item): item is string => Boolean(item))
  }

  const payload = request?.payload || request?.arguments
  if (payload && typeof payload === 'object') {
    return Object.entries(payload).map(([key, value]) => `${key}：${String(value)}`)
  }
  return []
}

function statusBadgeProps(status: string): { color: string; label: string; variant?: 'light' } {
  if (status === 'approved') return { color: 'success', label: '已同意', variant: 'light' }
  if (status === 'rejected') return { color: 'danger', label: '已拒绝', variant: 'light' }
  if (status === 'failed') return { color: 'danger', label: '执行失败', variant: 'light' }
  if (status === 'processing') return { color: 'warning', label: '处理中', variant: 'light' }
  return { color: 'gray', label: '待确认', variant: 'light' }
}

export interface ConfirmCardProps {
  request: ConfirmRequest
  status: string
  errorMessage?: string
  onConfirm?: (request: ConfirmRequest) => void
  onReject?: (request: ConfirmRequest) => void
}

export default function ConfirmCard({ request, status, errorMessage = '', onConfirm, onReject }: ConfirmCardProps) {
  const details = getDetails(request)
  const badge = statusBadgeProps(status)
  const detailNodes: ReactNode[] = details.map((item, index) => (
    // details 为展示性文本行，以内容+序号作 key
    <Text
      key={`${index}-${item}`}
      fz="var(--text-xs)"
      c="dimmed"
      style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
    >
      {item}
    </Text>
  ))

  return (
    <Paper w="100%" p="14px" radius="lg" bg="var(--color-warning-soft)" withBorder={false}>
      <Stack gap={6}>
        <Group justify="space-between" gap={8}>
          <Text fz="var(--text-xs)" c="warning.7" style={{ letterSpacing: '0.08em' }}>
            需要你确认
          </Text>
          <Badge {...badge} fz="var(--text-xs)">
            {badge.label}
          </Badge>
        </Group>

        <Text fz="var(--text-md)" fw={700} c="var(--color-text)">
          {getTitle(request)}
        </Text>

        <Text fz="var(--text-base)" c="warning.8" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {getReason(request)}
        </Text>

        {details.length > 0 ? (
          <Stack gap={5} mt={4}>
            {detailNodes}
          </Stack>
        ) : null}

        {errorMessage ? (
          <Text fz="var(--text-xs)" c="danger.5" mt={4}>
            {errorMessage}
          </Text>
        ) : null}

        <Group gap={8} mt={6}>
          <Button
            type="button"
            style={{ flex: '1 1 0' }}
            disabled={status !== 'pending'}
            onClick={() => onConfirm?.(request)}
          >
            {status === 'processing' ? '处理中' : '同意'}
          </Button>
          <Button
            type="button"
            variant="subtle"
            style={{ flex: '1 1 0' }}
            disabled={status !== 'pending'}
            onClick={() => onReject?.(request)}
          >
            先不要
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}
