import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useOutletContext, useNavigate } from 'react-router-dom'
import {
  AppShell,
  Badge,
  Box,
  Button,
  Card,
  Group,
  NavLink,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import {
  IconBook2,
  IconCalendarMonth,
  IconClipboardText,
  IconMessageCircle,
  IconNotebook,
  IconSettings,
  IconSquareCheck,
  IconWallet,
} from '@tabler/icons-react'

import { useModelSettings } from './hooks/useModelSettings'

// 应用外壳（React 版 App.vue）：
// - 左侧导航 + 顶部栏 + 路由出口 + 配网引导，导航由 react-router 驱动（router.tsx 唯一事实源）；
// - 旧版经 props/emits 上抛的导航事件（navHandlers）在 React 版由各页面直接 useNavigate 完成；
// - 设置首页需要的模型状态经 Outlet context 传递（等价旧 routeExtraProps）。

export const NAV_SECTIONS = [
  { path: '/chat', label: '聊天', hint: '和铃湾说说话', icon: IconMessageCircle },
  { path: '/diary', label: '日记', hint: '写下今天的心情', icon: IconNotebook },
  { path: '/ledger', label: '收支', hint: '轻松记一笔', icon: IconWallet },
  { path: '/todo', label: '待办', hint: '今天要做什么', icon: IconSquareCheck },
  { path: '/schedule', label: '日程', hint: '接下来的安排', icon: IconCalendarMonth },
  // R-04：记忆三栏——观察日志 / 当天日记 / 记忆 Wiki 平级入口
  { path: '/observe', label: '观察日志', hint: '今天留下的生活片段', icon: IconClipboardText },
  { path: '/memory', label: '记忆 Wiki', hint: '想留住的长期记忆', icon: IconBook2 },
  { path: '/settings', label: '设置', hint: '铃湾的连接和偏好', icon: IconSettings },
]

export interface AppOutletContext {
  modelStatus: ReturnType<typeof useModelSettings>['modelStatus']
  modelSettings: ReturnType<typeof useModelSettings>['modelSettings']
  refreshModelState: () => Promise<void>
}

export function useAppOutletContext(): AppOutletContext {
  return useOutletContext<AppOutletContext>()
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLDivElement>(null)

  const {
    modelStatus,
    modelSettings,
    form,
    updateForm,
    saving,
    loading: settingsLoading,
    errorMsg: settingsError,
    noticeMsg: settingsNotice,
    refresh: refreshModelState,
    check: checkModel,
    submit: submitModelSettings,
  } = useModelSettings()

  const activeSection = NAV_SECTIONS.find((item) => location.pathname.startsWith(item.path)) || NAV_SECTIONS[0]

  const isGuideVisible = !modelStatus.configured

  // FE-10：视图切换后焦点落位主内容区（键盘操作连续）。
  useEffect(() => {
    mainRef.current?.focus()
  }, [location.pathname])

  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 260, breakpoint: 'md' }} padding="lg" layout="alt">
      <AppShell.Header withBorder={false}>
        <Group align="baseline" gap="sm" h="100%" px="lg">
          <Title order={3} fz="var(--text-2xl)">
            {activeSection.label}
          </Title>
          <Text size="sm" c="dimmed">
            {activeSection.hint}
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" withBorder>
        <Stack gap="sm" h="100%" style={{ minHeight: 0 }}>
          <Group align="baseline" gap={8} px={8}>
            <Text fz="var(--text-2xl)" fw={800}>
              铃湾
            </Text>
            <Text fz="var(--text-sm)" c="dimmed">
              Cornie
            </Text>
          </Group>

          <Stack gap={6} style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {NAV_SECTIONS.map((section) => {
              const Icon = section.icon
              return (
                <NavLink
                  key={section.path}
                  active={location.pathname.startsWith(section.path)}
                  label={section.label}
                  description={section.hint}
                  leftSection={<Icon size={20} stroke={1.8} />}
                  onClick={() => navigate(section.path)}
                  styles={{
                    root: { borderRadius: 'var(--radius-md)' },
                    label: { fontWeight: 700, fontSize: 'var(--text-md)' },
                    description: { fontSize: 'var(--text-xs)' },
                  }}
                />
              )
            })}
          </Stack>

          <Box px={14} pt={10} style={{ borderTop: '1px solid var(--color-border)' }}>
            {modelStatus.ok ? (
              <Badge variant="dot" color="success" size="lg" w="100%">
                铃湾在线
              </Badge>
            ) : (
              <Badge variant="dot" color="gray" size="lg" w="100%">
                未连接
              </Badge>
            )}
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack
          gap="sm"
          h="calc(100vh - var(--app-shell-header-height, 56px) - var(--mantine-spacing-xl))"
          ref={mainRef as React.RefObject<HTMLDivElement>}
          tabIndex={-1}
          style={{ outline: 'none' }}
        >
          {isGuideVisible ? (
            <Card bg="var(--color-tint-chat)" p="xl" radius="lg" w="100%" maw={680}>
              <Stack gap="md">
                <Text fz="var(--text-xl)" fw={800}>
                  先把 DeepSeek 的钥匙交给铃湾吧
                </Text>
                <Text c="dimmed">还没检测到可用钥匙，铃湾需要连上 DeepSeek 才能继续陪你聊天、记日记。</Text>
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void submitModelSettings()
                  }}
                >
                  <Stack gap="sm">
                    <PasswordInput
                      aria-label="API Key"
                      placeholder="把你的 API Key 放在这里"
                      autoComplete="off"
                      value={form.apiKey}
                      onChange={(e) => updateForm({ apiKey: e.currentTarget.value })}
                    />
                    <TextInput
                      aria-label="Base URL"
                      placeholder="Base URL（可留空）"
                      value={form.baseUrl}
                      onChange={(e) => updateForm({ baseUrl: e.currentTarget.value })}
                    />
                    <TextInput
                      aria-label="模型名"
                      placeholder="模型名（默认 deepseek-chat）"
                      value={form.model}
                      onChange={(e) => updateForm({ model: e.currentTarget.value })}
                    />
                    <TextInput
                      aria-label="超时毫秒"
                      inputMode="numeric"
                      placeholder="超时毫秒（如 30000）"
                      value={form.timeoutMs}
                      onChange={(e) => updateForm({ timeoutMs: e.currentTarget.value })}
                    />
                    <Group gap="sm">
                      <Button type="submit" disabled={saving || settingsLoading}>
                        {saving ? '保存中…' : '保存并检测'}
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        disabled={saving || settingsLoading}
                        onClick={() => void checkModel()}
                      >
                        只检测
                      </Button>
                    </Group>
                  </Stack>
                </form>
                {settingsError ? (
                  <Text fz="var(--text-base)" c="danger.5">
                    {settingsError}
                  </Text>
                ) : null}
                {settingsNotice ? (
                  <Text fz="var(--text-base)" c="success.5">
                    {settingsNotice}
                  </Text>
                ) : null}
              </Stack>
            </Card>
          ) : (
            <Box style={{ flex: 1, minHeight: 0 }}>
              <Outlet context={{ modelStatus, modelSettings, refreshModelState } satisfies AppOutletContext} />
            </Box>
          )}
        </Stack>
      </AppShell.Main>
    </AppShell>
  )
}
