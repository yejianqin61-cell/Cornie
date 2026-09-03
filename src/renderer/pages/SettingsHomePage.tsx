import { useNavigate } from 'react-router-dom'
import { Button, Card, SimpleGrid, Stack, Text } from '@mantine/core'

import { useAppOutletContext } from '../App'
import { useModelSettings, type ModelSettingsState, type ModelStatus } from '../hooks/useModelSettings'

// 设置首页（React 版 SettingsHome.vue）。
// - 模型状态由外壳经 Outlet context 下发（等价旧版 routeExtraProps：外壳持有唯一的
//   useModelSettings 状态，本页不再单独调用，避免双份状态）；
// - 防御：本页若被渲染在 App 的 Outlet 之外（运行时拿不到 context），回退到本地
//   useModelSettings() 实例（独立组件承载，context 存在时不产生多余请求）；
// - 旧版 go:'deepseek-config'/'advanced' 事件在 App.vue 中无对应分支（盘点 §7-6 缺口），
//   React 版直接 useNavigate 跳转 /settings/deepseek 与 /settings/advanced。

function SettingsHomeView({
  modelStatus,
  modelSettings,
}: {
  modelStatus: ModelStatus
  modelSettings: ModelSettingsState
}) {
  const navigate = useNavigate()

  const statusText = modelStatus.ok ? '已连接' : modelStatus.configured ? '未连接（钥匙可能在但连不上）' : '未配置'
  const statusColor = modelStatus.ok ? 'success.5' : modelStatus.configured ? 'warning.5' : 'dimmed'

  return (
    <Stack gap="md" h="100%" style={{ overflowY: 'auto' }}>
      {/* /settings 是设置层级根，返回按旧版 handleBack 兜底规则回 /chat */}
      <Button variant="subtle" w="fit-content" onClick={() => navigate('/chat')}>
        ← 返回聊天
      </Button>

      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md" verticalSpacing="md">
        {/* 铃湾连接状态 */}
        <Card p="16px 20px" withBorder>
          <Stack gap={6} align="flex-start">
            <Text fw={700} fz="var(--text-md)">
              铃湾连接状态
            </Text>
            <Text fz="var(--text-2xl)" fw={800} c={statusColor}>
              {statusText}
            </Text>
            {modelStatus.ok ? (
              <Text fz="var(--text-sm)" c="dimmed">
                当前模型：{modelStatus.model || modelSettings.model || 'deepseek-chat'}
              </Text>
            ) : modelSettings.configured ? (
              <Text fz="var(--text-sm)" c="dimmed">
                钥匙已保存：{modelSettings.maskedApiKey}
              </Text>
            ) : null}
            {modelSettings.configured ? (
              <Text fz="var(--text-sm)" c="dimmed">
                超时毫秒：{modelSettings.timeoutMs ?? '未设置'}
              </Text>
            ) : null}
          </Stack>
        </Card>

        {/* DeepSeek 配置入口 */}
        <Card p="16px 20px" withBorder>
          <Stack gap="sm" align="flex-start">
            <Text fw={700} fz="var(--text-md)">
              DeepSeek 配置
            </Text>
            <Button variant="default" onClick={() => navigate('/settings/deepseek')}>
              前往配置
            </Button>
          </Stack>
        </Card>

        {/* 数据与隐私 */}
        <Card p="16px 20px" withBorder>
          <Stack gap={6}>
            <Text fw={700} fz="var(--text-md)">
              数据与隐私
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              数据保存在本地；对话内容会发送给模型服务。
            </Text>
          </Stack>
        </Card>

        {/* 高级设置入口 */}
        <Card p="16px 20px" withBorder>
          <Stack gap="sm" align="flex-start">
            <Text fw={700} fz="var(--text-md)">
              高级设置
            </Text>
            <Button variant="subtle" color="gray" onClick={() => navigate('/settings/advanced')}>
              进入高级设置 →
            </Button>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  )
}

// 防御分支：仅在拿不到外壳 Outlet context 时挂载（本地拉取一次模型状态）。
function SettingsHomeFallback() {
  const { modelStatus, modelSettings } = useModelSettings()
  return <SettingsHomeView modelStatus={modelStatus} modelSettings={modelSettings} />
}

export default function SettingsHomePage() {
  // useAppOutletContext 的 TS 签名为非空，但渲染在 App Outlet 之外时运行时为 null——
  // 这里按可缺失防御处理，缺失时回退本地实例。
  const outlet = useAppOutletContext()
  if (outlet?.modelStatus && outlet?.modelSettings) {
    return <SettingsHomeView modelStatus={outlet.modelStatus} modelSettings={outlet.modelSettings} />
  }
  return <SettingsHomeFallback />
}
