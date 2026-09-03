import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  ThemeIcon,
} from '@mantine/core'

// 高级设置页（React 版 AdvancedSettings.vue）。
// - 字段逐项保留：高级模式开关（Switch，替代旧「已启用/已关闭」按钮对）+ 6 张功能卡
//   （点击选中高亮、再点取消），面板内容区随 activePanel 切换；
// - 本页无 API 提交，提交契约不变；
// - memory-wiki 面板依赖的 MemoryWikiWorkspace 仍为 Vue 版（React 版随记忆模块重写接入），
//   暂以占位说明；其余面板与旧版同为「即将提供」。

const PANELS = [
  // R-07：与前台「记忆 Wiki」入口分工——本工作台定位为治理/高级功能，日常翻阅与编辑在前台
  { id: 'memory-wiki', label: '记忆治理工作台', hint: '版本回滚、主题索引、治理审核、巡检与审计' },
  { id: 'versions', label: '版本历史', hint: '查看页面的历史版本' },
  { id: 'rollback', label: '页面回滚', hint: '将页面恢复到历史版本' },
  { id: 'governance', label: '治理审核池', hint: '待审核的治理请求' },
  { id: 'inspection', label: '巡检结果', hint: '系统巡检发现的问题' },
  { id: 'audit', label: '审计查看', hint: '操作审计记录' },
] as const

type PanelId = (typeof PANELS)[number]['id']

export default function AdvancedSettingsPage() {
  const navigate = useNavigate()
  const [advancedMode, setAdvancedMode] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelId | ''>('')

  return (
    <Stack gap="md" h="100%" style={{ overflow: 'hidden' }}>
      <Group gap="md" wrap="nowrap">
        <Button variant="subtle" w="fit-content" onClick={() => navigate('/settings')}>
          ← 返回设置
        </Button>
        <Text fz="var(--text-xl)" fw={800}>
          高级设置
        </Text>
        <Group gap="sm" ml="auto" wrap="nowrap">
          <Switch
            label="高级模式"
            description={advancedMode ? '已启用' : '已关闭'}
            checked={advancedMode}
            onChange={(event) => setAdvancedMode(event.currentTarget.checked)}
          />
        </Group>
      </Group>

      {advancedMode ? (
        <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="sm" verticalSpacing="sm">
            {PANELS.map((panel) => {
              const active = activePanel === panel.id
              return (
                <Card
                  key={panel.id}
                  p="14px"
                  withBorder
                  onClick={() => setActivePanel(active ? '' : panel.id)}
                  aria-pressed={active}
                  bg={active ? 'brand.0' : undefined}
                  styles={{
                    root: {
                      cursor: 'pointer',
                      textAlign: 'left',
                      ...(active ? {} : { '&:hover': { background: 'var(--color-surface-2)' } }),
                    },
                  }}
                >
                  <Text fw={600} fz="var(--text-md)">
                    {panel.label}
                  </Text>
                  <Text fz="var(--text-sm)" c="dimmed" mt={4}>
                    {panel.hint}
                  </Text>
                </Card>
              )
            })}
          </SimpleGrid>

          <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {activePanel === 'memory-wiki' ? (
              <Alert color="brand" variant="light">
                记忆治理工作台依赖的记忆 Wiki 模块正在重写中，迁移完成后在此接入。
              </Alert>
            ) : activePanel ? (
              <Paper p="40px" radius="md" style={{ border: '1px dashed var(--color-border)' }}>
                <Text c="dimmed" ta="center">
                  即将提供
                </Text>
              </Paper>
            ) : null}
          </Box>
        </Stack>
      ) : (
        <Center style={{ flex: 1 }}>
          <Stack align="center" gap="sm">
            <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
              🔒
            </ThemeIcon>
            <Text c="dimmed">高级模式已关闭，面向高级用户</Text>
            <Button onClick={() => setAdvancedMode(true)}>开启高级模式</Button>
          </Stack>
        </Center>
      )}
    </Stack>
  )
}
