import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Group, Loader, PasswordInput, Stack, Text, TextInput } from '@mantine/core'

import { useAppOutletContext } from '../App'
import { useModelSettings } from '../hooks/useModelSettings'

// DeepSeek 配置页（React 版 DeepseekConfig.vue）。
// - 四个字段与旧版逐项一致：placeholder、apiKey 永不回填（已保存时单独展示 maskedApiKey）、
//   timeoutMs 以字符串原样入 PUT payload（服务端校验正整数）；
// - 本页持有自己的 useModelSettings 实例（等价旧版组件内调用），错误/成功文案走 hook 的
//   toFriendlyError 输出路径；保存/清空成功后经外壳 refreshModelState 刷新顶栏在线状态
//   （等价旧版 emit('updated') → App.refreshModelState）。

export default function DeepseekConfigPage() {
  const navigate = useNavigate()
  const { refreshModelState } = useAppOutletContext()
  const {
    modelSettings,
    form,
    updateForm,
    saving,
    loading,
    errorMsg,
    noticeMsg,
    check: checkOnly,
    submit,
    reset,
  } = useModelSettings()

  const save = async (): Promise<void> => {
    const ok = await submit()
    if (ok) void refreshModelState()
  }

  const clearAll = async (): Promise<void> => {
    const ok = await reset()
    if (ok) void refreshModelState()
  }

  return (
    <Stack gap="md" h="100%" style={{ overflow: 'hidden' }}>
      <Group gap="md" wrap="nowrap">
        <Button variant="subtle" w="fit-content" onClick={() => navigate('/settings')}>
          ← 返回设置
        </Button>
        <Text fz="var(--text-xl)" fw={800}>
          DeepSeek 配置
        </Text>
      </Group>

      {loading ? (
        <Group justify="center" gap="sm" py="xl">
          <Loader size="sm" type="dots" />
          <Text c="dimmed">检查中…</Text>
        </Group>
      ) : (
        <Card p="24px" withBorder maw={560}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            <Stack gap="md">
              <PasswordInput
                label="DeepSeek API Key"
                placeholder="把你的钥匙放在这里"
                autoComplete="off"
                value={form.apiKey}
                onChange={(e) => updateForm({ apiKey: e.currentTarget.value })}
              />
              <TextInput
                label="Base URL（可留空）"
                placeholder="默认地址即可"
                value={form.baseUrl}
                onChange={(e) => updateForm({ baseUrl: e.currentTarget.value })}
              />
              <TextInput
                label="模型名"
                placeholder="deepseek-chat"
                value={form.model}
                onChange={(e) => updateForm({ model: e.currentTarget.value })}
              />
              {/* 提交契约：timeoutMs 保持字符串原样提交，不用 NumberInput */}
              <TextInput
                label="超时毫秒"
                inputMode="numeric"
                placeholder="30000"
                value={form.timeoutMs}
                onChange={(e) => updateForm({ timeoutMs: e.currentTarget.value })}
              />

              {modelSettings.maskedApiKey ? (
                <Alert color="brand" variant="light">
                  当前已保存：{modelSettings.maskedApiKey}
                </Alert>
              ) : null}
              {errorMsg ? (
                <Alert color="danger" variant="light">
                  {errorMsg}
                </Alert>
              ) : null}
              {noticeMsg ? (
                <Alert color="success" variant="light">
                  {noticeMsg}
                </Alert>
              ) : null}

              <Group gap="sm" wrap="wrap">
                <Button type="submit" disabled={saving}>
                  {saving ? '保存中…' : '保存并检测'}
                </Button>
                <Button type="button" variant="default" disabled={saving} onClick={() => void checkOnly()}>
                  只检测
                </Button>
                {modelSettings.configured ? (
                  <Button
                    type="button"
                    variant="subtle"
                    color="danger"
                    disabled={saving}
                    onClick={() => void clearAll()}
                  >
                    清空钥匙
                  </Button>
                ) : null}
              </Group>
            </Stack>
          </form>
        </Card>
      )}
    </Stack>
  )
}
