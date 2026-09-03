import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, Group, Modal, Stack, Text, TextInput, Textarea } from '@mantine/core'

import { deleteObservation, getObservation, updateObservation } from '../api'
import { useRequestGuard } from '../hooks/useRequestGuard'

// 观察详情页（React 版 ObservationDetail.vue）：标题/内容编辑 + 保存 + 删除（Modal 确认）。

const OBSERVATION_TYPES: Record<string, { label: string }> = {
  event: { label: '生活事件' },
  fact: { label: '事实片段' },
  emotion: { label: '情绪变化' },
  preference: { label: '偏好线索' },
  misc: { label: '小事记录' },
}

interface ObservationData {
  title?: string
  content?: string
  type?: string
  date?: string
  [key: string]: unknown
}

export default function ObservationDetailPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const detailGuard = useRequestGuard()

  const [obs, setObs] = useState<ObservationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [dirty, setDirty] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const typeMeta = OBSERVATION_TYPES[String(obs?.type || '')] || OBSERVATION_TYPES.misc
  const contentPlaceholder = (() => {
    if (obs?.type === 'event') return '何时发生、有什么细节'
    if (obs?.type === 'fact') return '把事实写清楚'
    if (obs?.type === 'emotion') return '当时的感受与变化'
    if (obs?.type === 'preference') return '喜欢或不喜欢什么'
    return '补充细节'
  })()

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const { token, signal } = detailGuard.begin('detail')
      setLoading(true)
      try {
        const data = (await getObservation(id, { signal })) as { observation?: ObservationData }
        if (!cancelled && detailGuard.isCurrent('detail', token)) {
          setObs(data.observation || null)
        }
      } catch (e) {
        if (!cancelled && detailGuard.isCurrent('detail', token)) {
          setErrorMsg((e as { message?: string })?.message || '加载失败，请稍后再试')
        }
      } finally {
        if (!cancelled && detailGuard.isCurrent('detail', token)) {
          setLoading(false)
          detailGuard.end('detail', token)
        }
      }
    }
    void init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const save = useCallback(async (): Promise<void> => {
    if (!obs || saving) return
    setSaving(true)
    setErrorMsg('')
    try {
      const data = (await updateObservation(id, {
        title: obs.title,
        content: obs.content,
        type: obs.type,
        date: obs.date,
      })) as { observation?: ObservationData }
      setObs(data.observation || obs)
      setDirty(false)
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || '保存失败，请稍后再试')
    } finally {
      setSaving(false)
    }
  }, [obs, saving, id])

  const remove = useCallback(async (): Promise<void> => {
    try {
      await deleteObservation(id)
      setConfirmDelete(false)
      navigate('/observe/list')
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || '删除失败，请稍后再试')
    }
  }, [id, navigate])

  return (
    <Stack gap={12} h="100%" style={{ overflow: 'hidden' }}>
      <Group justify="space-between" gap={14} wrap="nowrap">
        <Button variant="subtle" onClick={() => navigate('/observe/list')}>
          ← 返回
        </Button>
        <Group gap={8}>
          <Button variant="subtle" color="danger" onClick={() => setConfirmDelete(true)}>
            删除
          </Button>
          <Button disabled={saving || !dirty} onClick={() => void save()}>
            {saving ? '保存中…' : '保存修改'}
          </Button>
        </Group>
      </Group>

      {loading ? (
        <Text ta="center" c="dimmed" p={40}>
          加载中…
        </Text>
      ) : errorMsg && !obs ? (
        <Alert color="danger" variant="light">
          {errorMsg}
        </Alert>
      ) : obs ? (
        <Card p={16} withBorder={false} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <Stack gap={14}>
            <Group gap={10}>
              <Text fz="var(--text-base)" c="dimmed">
                {obs.date}
              </Text>
              <Badge variant="light" color="gray">
                {typeMeta.label}
              </Badge>
            </Group>

            <Stack gap={6}>
              <Text fz="var(--text-sm)" c="dimmed">
                标题
              </Text>
              <TextInput
                placeholder="标题"
                value={obs.title || ''}
                onChange={(e) => {
                  const { value } = e.currentTarget
                  setObs((prev) => (prev ? { ...prev, title: value } : prev))
                  setDirty(true)
                }}
              />
            </Stack>

            <Stack gap={6} style={{ flex: 1 }}>
              <Text fz="var(--text-sm)" c="dimmed">
                内容
              </Text>
              <Textarea
                placeholder={contentPlaceholder}
                autosize
                minRows={10}
                value={obs.content || ''}
                onChange={(e) => {
                  const { value } = e.currentTarget
                  setObs((prev) => (prev ? { ...prev, content: value } : prev))
                  setDirty(true)
                }}
              />
            </Stack>

            {errorMsg ? (
              <Alert color="danger" variant="light">
                {errorMsg}
              </Alert>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      {/* 删除确认 */}
      <Modal opened={confirmDelete} onClose={() => setConfirmDelete(false)} title="删除观察" size={380}>
        <Stack gap="md">
          <Text fz="var(--text-base)">确认删除这条观察？删除后无法恢复。</Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="subtle" onClick={() => setConfirmDelete(false)}>
              先留着
            </Button>
            <Button color="danger" onClick={() => void remove()}>
              确定删除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
