import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'

import { completeTodo, createTodo, deleteTodo, listTodoCategories, listTodos, reopenTodo } from '../api'
import { listenDataChanged } from '../syncSignals'
import { useRequestGuard } from '../hooks/useRequestGuard'

// 待办首页（React 版 TodoHome.vue）。
// 重写改进：原生 confirm() 删除确认改为 Mantine Modal 二次确认；刷新接竞态守卫；
// 双击重复提交由 adding/toggle in-flight 标志守卫（盘点规格 03 风险项）。

interface TodoItem {
  id?: string | number
  title?: string
  status?: string
  categoryName?: string
  categoryId?: string
  dueAt?: string
  [key: string]: unknown
}

interface TodoCategory {
  id?: string | number
  name?: string
  [key: string]: unknown
}

export default function TodoHomePage() {
  const todoGuard = useRequestGuard()

  const [todos, setTodos] = useState<TodoItem[]>([])
  const [categories, setCategories] = useState<TodoCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [adding, setAdding] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [currentTab, setCurrentTab] = useState('active')
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const activeTodos = useMemo(() => todos.filter((todo) => todo?.status !== 'done'), [todos])
  const archivedTodos = useMemo(() => todos.filter((todo) => todo?.status === 'done'), [todos])
  const visibleTodos = currentTab === 'archived' ? archivedTodos : activeTodos

  const refresh = useCallback(async (): Promise<void> => {
    const { token } = todoGuard.begin('refresh')
    setLoading(true)
    try {
      const [todoData, catData] = await Promise.all([listTodos({}), listTodoCategories()])
      if (!todoGuard.isCurrent('refresh', token)) return
      const items = (((todoData as { items?: TodoItem[] })?.items || []) as TodoItem[]).filter(
        (todo) => todo?.status !== 'cancelled'
      )
      setTodos(items)
      setCategories(((catData as { items?: TodoCategory[] })?.items || []) as TodoCategory[])
    } catch {
      // ignore refresh failure
    } finally {
      if (todoGuard.isCurrent('refresh', token)) {
        setLoading(false)
        todoGuard.end('refresh', token)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void refresh()
    const stopListening = listenDataChanged((detail) => {
      if ((detail as { todo?: boolean })?.todo) void refresh()
    })
    return () => {
      stopListening()
    }
  }, [refresh])

  const addTodo = async (): Promise<void> => {
    const title = newTitle.trim()
    if (!title || adding) return
    setAdding(true)
    setErrorMsg('')
    try {
      const cat = categories.find((c) => String(c.id) === String(newCategoryId))
      await createTodo({
        title,
        categoryId: newCategoryId || null,
        categoryName: cat?.name || null,
        status: 'pending',
      })
      setNewTitle('')
      setNewCategoryId('')
      setCurrentTab('active')
      await refresh()
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || '添加失败')
    } finally {
      setAdding(false)
    }
  }

  const toggleTodo = async (todo: TodoItem): Promise<void> => {
    const id = String(todo.id ?? '')
    if (!id || togglingIds.has(id)) return
    setTogglingIds((prev) => new Set(prev).add(id))
    try {
      if (todo?.status === 'done') {
        await reopenTodo(id)
        setCurrentTab('active')
      } else {
        await completeTodo(id)
        setCurrentTab('active')
      }
      await refresh()
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || '操作失败')
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const removeTodo = async (id: string | undefined): Promise<void> => {
    if (!id) return
    try {
      await deleteTodo(id)
      setPendingDeleteId(null)
      await refresh()
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || '删除失败')
    }
  }

  const pendingDelete = pendingDeleteId ? todos.find((t) => String(t.id) === pendingDeleteId) : null

  return (
    <Stack gap={14} h="100%" style={{ overflowY: 'auto', paddingRight: 4 }}>
      {/* 概览 */}
      <Card p="16px 20px" bg="var(--color-tint-todo)" withBorder={false}>
        <Group justify="center" gap={0}>
          <Box ta="center" px={24}>
            <Text fz="var(--text-sm)" c="dimmed">
              当前待办
            </Text>
            <Text fz="var(--text-3xl)" fw={700} mt={4}>
              {activeTodos.length}
            </Text>
          </Box>
          <Box w={1} h={38} style={{ background: 'rgba(45, 42, 38, 0.08)' }} />
          <Box ta="center" px={24}>
            <Text fz="var(--text-sm)" c="dimmed">
              已归档
            </Text>
            <Text fz="var(--text-3xl)" fw={700} mt={4} c="dimmed">
              {archivedTodos.length}
            </Text>
          </Box>
        </Group>
      </Card>

      {/* 快速新增 */}
      <Card p="14px 20px" withBorder={false}>
        <Text fw={700} fz="var(--text-md)">
          记下一件小事
        </Text>
        <Group gap={8} mt={10} align="center" wrap="nowrap">
          <TextInput
            flex={1}
            placeholder="新增待办..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void addTodo()
              }
            }}
          />
          <Select
            w={110}
            data={[
              { value: '', label: '类目' },
              ...categories.map((c) => ({ value: String(c.id), label: String(c.name) })),
            ]}
            value={newCategoryId}
            onChange={(value) => setNewCategoryId(value || '')}
            allowDeselect={false}
          />
          <Button disabled={adding || !newTitle.trim()} onClick={() => void addTodo()}>
            {adding ? '保存中…' : '新增'}
          </Button>
        </Group>
        {errorMsg ? (
          <Alert color="danger" variant="light" mt={8} p="8px 12px">
            {errorMsg}
          </Alert>
        ) : null}
      </Card>

      {/* 列表 */}
      <Card p="14px 20px" withBorder={false}>
        <Text fw={700}>待办整理</Text>
        <Text fz="var(--text-sm)" c="dimmed" mt={4}>
          {currentTab === 'archived' ? '已完成的待办' : '进行中的待办'}
        </Text>

        <SegmentedControl
          mt={12}
          value={currentTab}
          onChange={setCurrentTab}
          data={[
            { value: 'active', label: `待办 (${activeTodos.length})` },
            { value: 'archived', label: `已归档 (${archivedTodos.length})` },
          ]}
          radius="xl"
        />

        {visibleTodos.length === 0 && !loading ? (
          <Text c="dimmed" ta="center" py={40}>
            {currentTab === 'archived' ? '暂无归档' : '暂无待办'}
          </Text>
        ) : (
          <Stack gap={8} mt={12}>
            {visibleTodos.map((t) => {
              const id = String(t.id ?? '')
              const done = t?.status === 'done'
              return (
                <Group
                  key={id}
                  align="center"
                  gap={12}
                  px={14}
                  py={12}
                  wrap="nowrap"
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    background: done ? 'rgba(45, 42, 38, 0.03)' : 'var(--color-surface)',
                  }}
                >
                  <Checkbox
                    checked={done}
                    onChange={() => void toggleTodo(t)}
                    disabled={togglingIds.has(id)}
                    styles={{
                      input: {
                        borderRadius: 999,
                        width: 18,
                        height: 18,
                        cursor: 'pointer',
                      },
                    }}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fz="var(--text-md)" c={done ? 'dimmed' : 'var(--color-text)'}>
                      {t.title}
                    </Text>
                    <Group gap={8} mt={4} wrap="wrap">
                      {t.categoryName ? (
                        <Badge size="xs" variant="light" color="gray">
                          {t.categoryName}
                        </Badge>
                      ) : null}
                      <Text fz="var(--text-xs)" c="dimmed">
                        {t.dueAt ? String(t.dueAt).slice(0, 10) : '还没有定日期'}
                      </Text>
                    </Group>
                  </Box>
                  <Group gap={6}>
                    {done ? (
                      <Button variant="subtle" size="compact-sm" onClick={() => void toggleTodo(t)}>
                        恢复
                      </Button>
                    ) : null}
                    <Button variant="subtle" color="danger" size="compact-sm" onClick={() => setPendingDeleteId(id)}>
                      删除
                    </Button>
                  </Group>
                </Group>
              )
            })}
          </Stack>
        )}
      </Card>

      {/* 删除确认（Mantine Modal 替代原生 confirm） */}
      <Modal opened={!!pendingDelete} onClose={() => setPendingDeleteId(null)} title="删除待办" size={380}>
        <Stack gap="md">
          <Text fz="var(--text-base)">
            确定删除这条待办吗？
            {pendingDelete?.title ? (
              <Text component="span" fw={700}>
                「{pendingDelete.title}」
              </Text>
            ) : null}
          </Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="subtle" onClick={() => setPendingDeleteId(null)}>
              先留着
            </Button>
            <Button color="danger" onClick={() => void removeTodo(pendingDeleteId ?? undefined)}>
              确定删除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
