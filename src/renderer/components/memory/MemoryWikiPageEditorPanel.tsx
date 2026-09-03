// 页面编辑面板（React 版 components/MemoryWikiPageEditorPanel.vue）。
// 35 字段草稿受控编辑 + 按 pageType 条件渲染四组 identity 字段；归档/回滚等破坏性动作
// 改为 Mantine Modal 二次确认（替代旧版一键执行）；聊天/观察来源卡按旧 navHandlers 契约
// 直接 useNavigate（open-chat-source → /chat/day/:date?focus=:messageId、观察 → /observe/detail/:id）。

import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'

import {
  MEMORY_IMPORTANCE_OPTIONS,
  MEMORY_PAGE_STATUS_OPTIONS,
  MEMORY_PAGE_TYPE_OPTIONS,
  type IdentityPageOption,
  type IdentityRelationshipCandidate,
  type MemoryWikiPageForm,
  type PageSourceTrace,
  type SourceTraceRelatedIssue,
} from '../../hooks/useMemoryWikiWorkspace'
import type { MemoryWikiPage } from '../../api'

const PAGE_TYPE_SELECT_DATA = MEMORY_PAGE_TYPE_OPTIONS.map((value) => ({ value, label: value }))
const STATUS_SELECT_DATA = MEMORY_PAGE_STATUS_OPTIONS.map((value) => ({ value, label: value }))
const IMPORTANCE_SELECT_DATA = MEMORY_IMPORTANCE_OPTIONS.map((value) => ({ value, label: value }))
const LOW_MEDIUM_HIGH_SELECT_DATA = ['low', 'medium', 'high'].map((value) => ({ value, label: value }))

const PREFERENCE_TYPE_DATA = [
  { value: '', label: '未分类' },
  { value: '饮食', label: '饮食' },
  { value: '交流', label: '交流' },
  { value: '风格', label: '风格' },
  { value: '作息', label: '作息' },
  { value: '情感表达', label: '情感表达' },
]

const STANCE_DATA = [
  { value: '', label: '未标注' },
  { value: '喜欢', label: '喜欢' },
  { value: '不喜欢', label: '不喜欢' },
  { value: '中性偏好', label: '中性偏好' },
]

const TRAIT_TYPE_DATA = [
  { value: '', label: '未分类' },
  { value: '性格倾向', label: '性格倾向' },
  { value: '情绪模式', label: '情绪模式' },
  { value: '沟通风格', label: '沟通风格' },
  { value: '压力反应', label: '压力反应' },
  { value: '关系状态', label: '关系状态' },
]

interface MemoryWikiPageEditorPanelProps {
  pageForm: MemoryWikiPageForm
  onFormChange: (patch: Partial<MemoryWikiPageForm>) => void
  selectedPage: MemoryWikiPage | null
  saving: boolean
  pageSourceTrace: PageSourceTrace | null
  selectedVersionId: string
  identityPageOptions: IdentityPageOption[]
  identityRelationshipRules: string[]
  identityRelationshipCandidates: IdentityRelationshipCandidate[]
  identityRelationshipWarnings: string[]
  relatedPageIssues: SourceTraceRelatedIssue[]
  relatedPageSelection: string[]
  onRelatedPageSelectionChange: (value: string[]) => void
  pageTopicKeyword: string
  onPageTopicKeywordChange: (value: string) => void
  pageTopicAliasesText: string
  onPageTopicAliasesTextChange: (value: string) => void
  pageTopicNote: string
  onPageTopicNoteChange: (value: string) => void
  onReset: () => void
  onSave: () => void
  onArchive: () => void
  onRestore: () => void
  onRollback: () => void
  onSaveRelatedPages: () => void
  onLinkTopic: () => void
}

function FieldShell({ label, span = 6, children }: { label: string; span?: number; children: ReactNode }) {
  return (
    <Grid.Col span={{ base: 12, sm: span }}>
      <Stack gap={6}>
        <Text fz="var(--text-base)">{label}</Text>
        {children}
      </Stack>
    </Grid.Col>
  )
}

function SectionShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap={10} mt={14}>
      <Text fz="var(--text-base)" fw={700}>
        {title}
      </Text>
      {children}
    </Stack>
  )
}

export default function MemoryWikiPageEditorPanel({
  pageForm,
  onFormChange,
  selectedPage,
  saving,
  pageSourceTrace,
  selectedVersionId,
  identityPageOptions,
  identityRelationshipRules,
  identityRelationshipCandidates,
  identityRelationshipWarnings,
  relatedPageIssues,
  relatedPageSelection,
  onRelatedPageSelectionChange,
  pageTopicKeyword,
  onPageTopicKeywordChange,
  pageTopicAliasesText,
  onPageTopicAliasesTextChange,
  pageTopicNote,
  onPageTopicNoteChange,
  onReset,
  onSave,
  onArchive,
  onRestore,
  onRollback,
  onSaveRelatedPages,
  onLinkTopic,
}: MemoryWikiPageEditorPanelProps) {
  const navigate = useNavigate()
  const [pendingArchive, setPendingArchive] = useState(false)
  const [pendingRollback, setPendingRollback] = useState(false)

  const text = (field: keyof MemoryWikiPageForm) => ({
    value: String(pageForm[field] ?? ''),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onFormChange({ [field]: event.currentTarget.value } as Partial<MemoryWikiPageForm>),
  })

  const option = (field: keyof MemoryWikiPageForm, data: Array<{ value: string; label: string }>) => ({
    data,
    value: String(pageForm[field] ?? ''),
    onChange: (value: string | null) => onFormChange({ [field]: value ?? '' } as Partial<MemoryWikiPageForm>),
  })

  const chatSources = pageSourceTrace?.chatSources ?? []
  const observationSources = pageSourceTrace?.observationSources ?? []

  return (
    <Card p="16px" withBorder>
      <Stack gap={12}>
        <Group justify="space-between" align="flex-start" gap={8} wrap="wrap">
          <Text fw={700}>{selectedPage ? '编辑页面' : '新建页面'}</Text>
          {selectedPage ? (
            <Button variant="subtle" size="compact-sm" onClick={onReset}>
              新建页面
            </Button>
          ) : null}
        </Group>

        <Grid gap={12}>
          <FieldShell label="页面类型">
            <Select allowDeselect={false} {...option('pageType', PAGE_TYPE_SELECT_DATA)} />
          </FieldShell>
          <FieldShell label="状态">
            <Select allowDeselect={false} {...option('status', STATUS_SELECT_DATA)} />
          </FieldShell>
          <FieldShell label="标题" span={12}>
            <TextInput placeholder="输入页面标题" {...text('title')} />
          </FieldShell>

          {pageForm.pageType === 'identity_profile' ? (
            <>
              <FieldShell label="用户名字">
                <TextInput placeholder="例如：叶健钦" {...text('userName')} />
              </FieldShell>
              <FieldShell label="偏好称呼">
                <TextInput placeholder="例如：爸爸" {...text('preferredName')} />
              </FieldShell>
              <FieldShell label="与 Cornie 的关系" span={12}>
                <TextInput
                  placeholder="例如：用户是 Cornie 的创造者，也是 Cornie 的爸爸"
                  {...text('cornieRelationship')}
                />
              </FieldShell>
              <FieldShell label="身份摘要" span={12}>
                <Textarea placeholder="例如：项目与求职并行推进中" minRows={3} {...text('identitySummary')} />
              </FieldShell>
              <FieldShell label="阶段概况" span={12}>
                <Textarea placeholder="例如：学业与多个项目并行" minRows={3} {...text('lifeStageSummary')} />
              </FieldShell>
              <FieldShell label="当前关注">
                <TextInput placeholder="例如：项目推进、考试、实习" {...text('currentFocus')} />
              </FieldShell>
              <FieldShell label="主要压力">
                <TextInput placeholder="例如：时间压力、项目并行、求职焦虑" {...text('stressors')} />
              </FieldShell>
              <FieldShell label="沟通偏好" span={12}>
                <Textarea
                  placeholder="例如：希望被温柔、克制、记得上下文地陪伴。"
                  minRows={2}
                  {...text('communicationPreference')}
                />
              </FieldShell>
            </>
          ) : null}

          {pageForm.pageType === 'identity_preference' ? (
            <>
              <FieldShell label="偏好类型">
                <Select allowDeselect={false} {...option('preferenceType', PREFERENCE_TYPE_DATA)} />
              </FieldShell>
              <FieldShell label="立场">
                <Select allowDeselect={false} {...option('stance', STANCE_DATA)} />
              </FieldShell>
              <FieldShell label="稳定性">
                <Select allowDeselect={false} {...option('stabilityLevel', LOW_MEDIUM_HIGH_SELECT_DATA)} />
              </FieldShell>
              <FieldShell label="证据计数">
                <NumberInput
                  min={0}
                  value={pageForm.evidenceCount}
                  onChange={(value) => onFormChange({ evidenceCount: typeof value === 'number' ? value : 0 })}
                />
              </FieldShell>
              <FieldShell label="最近确认时间" span={12}>
                <TextInput placeholder="例如：2026-06-29" {...text('lastConfirmedAt')} />
              </FieldShell>
              <FieldShell label="触发关键词（逗号分隔）" span={12}>
                <TextInput placeholder="例如：奶茶, 咖啡, 甜度" {...text('triggerKeywordsText')} />
              </FieldShell>
            </>
          ) : null}

          {pageForm.pageType === 'identity_person' ? (
            <>
              <FieldShell label="人物名字">
                <TextInput placeholder="例如：钟奕菲" {...text('personName')} />
              </FieldShell>
              <FieldShell label="与用户关系">
                <TextInput placeholder="例如：初恋、朋友、家人" {...text('relationshipToUser')} />
              </FieldShell>
              <FieldShell label="身份摘要" span={12}>
                <Textarea
                  placeholder="例如：用户人生中具有高情感权重的重要人物。"
                  minRows={2}
                  {...text('roleSummary')}
                />
              </FieldShell>
              <FieldShell label="性格摘要" span={12}>
                <Textarea placeholder="例如：温柔、害羞、内向。" minRows={2} {...text('personalitySummary')} />
              </FieldShell>
              <FieldShell label="共同经历" span={12}>
                <Textarea
                  placeholder="例如：2021年冬天相恋，2022年春天疏远，2022年夏天决裂。"
                  minRows={3}
                  {...text('sharedExperienceSummary')}
                />
              </FieldShell>
              <FieldShell label="情感权重">
                <TextInput placeholder="例如：high / 很高" {...text('emotionalWeight')} />
              </FieldShell>
              <FieldShell label="首次已知阶段">
                <TextInput placeholder="例如：2021年冬天" {...text('firstKnownPeriod')} />
              </FieldShell>
              <FieldShell label="时间线摘要" span={12}>
                <Textarea placeholder="例如：相恋-疏远-决裂。" minRows={2} {...text('timelineSummary')} />
              </FieldShell>
            </>
          ) : null}

          {pageForm.pageType === 'identity_trait' ? (
            <>
              <FieldShell label="侧写类型">
                <Select allowDeselect={false} {...option('traitType', TRAIT_TYPE_DATA)} />
              </FieldShell>
              <FieldShell label="置信度">
                <Select allowDeselect={false} {...option('confidenceLevel', LOW_MEDIUM_HIGH_SELECT_DATA)} />
              </FieldShell>
              <FieldShell label="稳定性">
                <Select allowDeselect={false} {...option('stabilityLevel', LOW_MEDIUM_HIGH_SELECT_DATA)} />
              </FieldShell>
              <FieldShell label="主人确认">
                <Switch
                  mt={6}
                  label={pageForm.ownerConfirmed ? '已确认' : '未确认'}
                  checked={pageForm.ownerConfirmed === true}
                  onChange={(event) => onFormChange({ ownerConfirmed: event.currentTarget.checked })}
                />
              </FieldShell>
              <FieldShell label="侧写摘要" span={12}>
                <Textarea placeholder="例如：高压时容易疲惫" minRows={3} {...text('traitSummary')} />
              </FieldShell>
              <FieldShell label="证据计数">
                <NumberInput
                  min={0}
                  value={pageForm.evidenceCount}
                  onChange={(value) => onFormChange({ evidenceCount: typeof value === 'number' ? value : 0 })}
                />
              </FieldShell>
              <FieldShell label="最近确认时间">
                <TextInput placeholder="例如：2026-06-29" {...text('lastConfirmedAt')} />
              </FieldShell>
              <FieldShell label="触发关键词（逗号分隔）" span={12}>
                <TextInput placeholder="例如：压力, 焦虑, 安慰, 累" {...text('triggerKeywordsText')} />
              </FieldShell>
            </>
          ) : null}

          <FieldShell label="摘要" span={12}>
            <Textarea placeholder="写一段简短摘要" minRows={4} {...text('summary')} />
          </FieldShell>
          <FieldShell label="正文" span={12}>
            <Textarea placeholder="这里是页面正文 Markdown" minRows={10} {...text('body')} />
          </FieldShell>
          <FieldShell label="别名（逗号分隔）" span={12}>
            <TextInput placeholder="例如：龙虾, 澳洲龙虾" {...text('aliasesText')} />
          </FieldShell>
          <FieldShell label="重要性">
            <Select allowDeselect={false} {...option('importance', IMPORTANCE_SELECT_DATA)} />
          </FieldShell>
          <FieldShell label="页面 ID">
            <TextInput value={pageForm.pageId || '保存后生成'} disabled />
          </FieldShell>
        </Grid>

        <Group gap={10} wrap="wrap">
          <Button loading={saving} onClick={onSave}>
            {saving ? '保存中…' : '保存页面'}
          </Button>
          {pageForm.pageId && pageForm.status !== 'archived' ? (
            <Button variant="default" disabled={saving} onClick={() => setPendingArchive(true)}>
              归档页面
            </Button>
          ) : null}
          {pageForm.pageId && pageForm.status === 'archived' ? (
            <Button variant="default" disabled={saving} onClick={onRestore}>
              恢复页面
            </Button>
          ) : null}
          {pageForm.pageId ? (
            <Tooltip
              label={selectedVersionId ? '回滚到选中历史快照' : '先在「版本历史与回滚」中选择一个版本'}
              disabled={Boolean(selectedVersionId)}
            >
              <Button
                variant="subtle"
                color="danger"
                disabled={saving || !selectedVersionId}
                onClick={() => setPendingRollback(true)}
              >
                {selectedVersionId ? '回滚到当前选中版本' : '先选择版本再回滚'}
              </Button>
            </Tooltip>
          ) : null}
        </Group>

        {pageSourceTrace && pageForm.pageId ? (
          <SectionShell title="来源追溯">
            <Text fz="var(--text-base)" c="dimmed">
              关联页面：{(pageSourceTrace.relatedPages ?? []).map((item) => item.title).join(', ') || '无'}
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              聊天来源：{chatSources.map((item) => item.date).join(', ') || '无'}
            </Text>
            <Text fz="var(--text-base)" c="dimmed">
              观察来源：{observationSources.map((item) => item.title).join(', ') || '无'}
            </Text>

            {chatSources.length > 0 ? (
              <SectionShell title="聊天片段">
                <Stack gap={10}>
                  {chatSources.map((item) => (
                    <UnstyledButton
                      key={`${item.date}-${item.messageId}`}
                      onClick={() => {
                        // 旧 navHandlers 契约：open-chat-source → /chat/day/:date?focus=:messageId
                        if (item.date && item.messageId) navigate(`/chat/day/${item.date}?focus=${item.messageId}`)
                      }}
                      w="100%"
                      style={{ textAlign: 'left' }}
                    >
                      <Text fz="var(--text-sm)" fw={700} c={item.date && item.messageId ? 'brand.7' : undefined}>
                        {item.title || '聊天片段'}
                      </Text>
                      <Text fz="var(--text-base)" c="dimmed">
                        {item.preview || '原消息已不可读'}
                      </Text>
                    </UnstyledButton>
                  ))}
                </Stack>
              </SectionShell>
            ) : null}

            {observationSources.length > 0 ? (
              <SectionShell title="观察记录">
                <Stack gap={10}>
                  {observationSources.map((item) => (
                    <UnstyledButton
                      key={item.observationId}
                      onClick={() => {
                        // 旧 navHandlers 契约：open-observation → /observe/detail/:id
                        if (item.observationId) navigate(`/observe/detail/${item.observationId}`)
                      }}
                      w="100%"
                      style={{ textAlign: 'left' }}
                    >
                      <Text fz="var(--text-sm)" fw={700} c={item.observationId ? 'brand.7' : undefined}>
                        {item.title || '观察记录'}
                      </Text>
                      <Text fz="var(--text-base)" c="dimmed">
                        {item.preview || '原观察记录已不可读'}
                      </Text>
                    </UnstyledButton>
                  ))}
                </Stack>
              </SectionShell>
            ) : null}
          </SectionShell>
        ) : null}

        {pageForm.pageId && pageForm.pageType.startsWith('identity_') ? (
          <SectionShell title="Identity 关系链路">
            {identityRelationshipRules.length > 0 ? (
              <Stack gap={8}>
                {identityRelationshipRules.map((item) => (
                  <Paper key={item} px={12} py={10} radius="md" bg="var(--color-surface-2)">
                    <Text fz="var(--text-base)">{item}</Text>
                  </Paper>
                ))}
              </Stack>
            ) : null}

            <Grid gap={12}>
              <FieldShell label="关联 Identity 页面" span={12}>
                <MultiSelect
                  data={identityPageOptions.map((item) => ({
                    value: item.pageId,
                    label: `${item.title} · ${item.pageType} · ${item.status ?? ''}`,
                  }))}
                  value={relatedPageSelection}
                  onChange={onRelatedPageSelectionChange}
                  searchable
                  clearable
                  placeholder="选择要关联的 Identity 页面"
                />
              </FieldShell>
            </Grid>

            <Group gap={10} wrap="wrap">
              <Button variant="default" loading={saving} onClick={onSaveRelatedPages}>
                {saving ? '保存中…' : '保存关系链路'}
              </Button>
            </Group>

            {identityRelationshipCandidates.length > 0 ? (
              <SectionShell title="推荐补链">
                <Stack gap={8}>
                  {identityRelationshipCandidates.map((item) => (
                    <Paper key={item.pageId} px={12} py={10} radius="md" bg="var(--color-surface-2)">
                      <Group justify="space-between" gap={8}>
                        <Text fz="var(--text-base)">
                          {item.title} · {item.pageType}
                        </Text>
                        <Badge size="sm" variant="light" color={item.linked ? 'success' : 'gray'}>
                          {item.linked ? '已关联' : '可补充关联'}
                        </Badge>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </SectionShell>
            ) : null}

            {identityRelationshipWarnings.length > 0 ? (
              <SectionShell title="治理提醒">
                <Stack gap={8}>
                  {identityRelationshipWarnings.map((item) => (
                    <Alert key={item} color="warning" variant="light">
                      {item}
                    </Alert>
                  ))}
                </Stack>
              </SectionShell>
            ) : null}

            {relatedPageIssues.length > 0 ? (
              <SectionShell title="关联异常">
                <Stack gap={8}>
                  {relatedPageIssues.map((item, index) => (
                    <Alert key={`${item.issueType}-${item.relatedPageId}-${index}`} color="danger" variant="light">
                      {item.message || `${item.issueType ?? 'unknown'} · ${item.relatedPageId ?? 'unknown'}`}
                    </Alert>
                  ))}
                </Stack>
              </SectionShell>
            ) : null}
          </SectionShell>
        ) : null}

        {pageForm.pageId && pageForm.pageType === 'identity_person' ? (
          <SectionShell title="人物页联动 Topic">
            <Grid gap={12}>
              <FieldShell label="主题关键词">
                <TextInput
                  placeholder="例如：钟奕菲"
                  value={pageTopicKeyword}
                  onChange={(event) => onPageTopicKeywordChange(event.currentTarget.value)}
                />
              </FieldShell>
              <FieldShell label="沿用重要性">
                <TextInput value={pageForm.importance} disabled />
              </FieldShell>
              <FieldShell label="主题别名（逗号分隔）" span={12}>
                <TextInput
                  placeholder="例如：奕菲, 钟同学"
                  value={pageTopicAliasesText}
                  onChange={(event) => onPageTopicAliasesTextChange(event.currentTarget.value)}
                />
              </FieldShell>
              <FieldShell label="索引备注" span={12}>
                <Textarea
                  placeholder="给这个人物主题留一句简短备注"
                  minRows={3}
                  value={pageTopicNote}
                  onChange={(event) => onPageTopicNoteChange(event.currentTarget.value)}
                />
              </FieldShell>
            </Grid>
            <Group gap={10} wrap="wrap">
              <Button loading={saving} disabled={!pageTopicKeyword.trim()} onClick={onLinkTopic}>
                {saving ? '联动中…' : '联动到 Topic Index'}
              </Button>
            </Group>
          </SectionShell>
        ) : null}
      </Stack>

      {/* 归档二次确认（破坏性动作 Modal 化，归档≠删除，可恢复） */}
      <Modal opened={pendingArchive} onClose={() => setPendingArchive(false)} title="归档页面" size={420}>
        <Stack gap="md">
          <Text fz="var(--text-base)">
            确定归档「{pageForm.title || pageForm.pageId}」吗？
            归档后页面会移入「已归档」目录，随时可以恢复，不会真正删除。
          </Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="subtle" onClick={() => setPendingArchive(false)}>
              先不归档
            </Button>
            <Button
              color="danger"
              loading={saving}
              onClick={() => {
                setPendingArchive(false)
                onArchive()
              }}
            >
              确认归档
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 回滚二次确认 */}
      <Modal opened={pendingRollback} onClose={() => setPendingRollback(false)} title="回滚页面" size={420}>
        <Stack gap="md">
          <Text fz="var(--text-base)">回滚将把当前页面恢复到选中的历史快照，快照之后的修改会丢失。确定继续吗？</Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="subtle" onClick={() => setPendingRollback(false)}>
              取消
            </Button>
            <Button
              color="danger"
              loading={saving}
              disabled={!selectedVersionId}
              onClick={() => {
                setPendingRollback(false)
                onRollback()
              }}
            >
              确认回滚
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  )
}
