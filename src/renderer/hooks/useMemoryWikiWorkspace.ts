// 工作台编排状态机（React 版 composables/useMemoryWikiWorkspace.js）。
// 行为契约逐条对齐 Vue 版：refreshAll 四路并行、selectPage/Topic/Governance/Version 选中流、
// savePage 非事务四连写（create/update→aliases→status→importance）、治理详情跟随列表清空、
// 确认卡逐项乐观 'processing'；重写增强：select* 全部接 useRequestGuard（规格 §6.1 最高风险项）、
// 消费 listenDataChanged(detail.memory) 自动刷新（规格 §外壳接线 / LedgerHomePage 模式）。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  archiveMemoryWikiPage,
  createMemoryWikiPage,
  enqueueMemoryWikiInspectionScan,
  getMemoryWikiGovernanceRequest,
  getMemoryWikiPage,
  getMemoryWikiPageSourceTrace,
  getMemoryWikiPageVersionDiff,
  getTopicIndexItem,
  getTopicIndexSourceTrace,
  linkMemoryWikiPageToTopic,
  linkMemoryWikiRelatedPages,
  listConfirmations,
  listMemoryWikiGovernanceRequests,
  listMemoryWikiPageVersions,
  listMemoryWikiPages,
  listTopicIndexItems,
  restoreMemoryWikiPage,
  rollbackMemoryWikiPage,
  setMemoryWikiImportance,
  setMemoryWikiStatus,
  submitConfirmationDecision,
  updateMemoryWikiAliases,
  updateMemoryWikiGovernanceRequestStatus,
  updateMemoryWikiPage,
  updateTopicIndexAliases,
  type MemoryWikiPage,
} from '../api'
import { listenDataChanged } from '../syncSignals'
import { useRequestGuard } from './useRequestGuard'

// ─────────────────────────────────────────────────────────────────────────────
// 领域类型（以 API 归一化后的字段为契约，不照抄后端原始字段；规格 §6.6）
// ─────────────────────────────────────────────────────────────────────────────

export interface GovernanceQueueItem {
  requestId: string
  title?: string
  requestType?: string
  queueSection?: string
  status?: string
  riskLevel?: string
  [key: string]: unknown
}

export interface GovernanceDetail {
  requestId: string
  title?: string
  requestType?: string
  status?: string
  riskLevel?: string
  triggerSource?: string
  queueSection?: string
  pageIds?: string[]
  topicKeys?: string[]
  reason?: string
  payload?: Record<string, unknown>
  evidence?: unknown[]
  [key: string]: unknown
}

export interface TopicIndexItem {
  normalizedKey: string
  keyword?: string
  heatScore?: number
  pageIds?: string[]
  dates?: string[]
  [key: string]: unknown
}

export interface TopicDetail extends TopicIndexItem {
  aliases?: string[]
  aliasesText: string
}

export interface PageVersionItem {
  versionId: string
  reason?: string
  createdAt?: string
  [key: string]: unknown
}

export interface VersionDiff {
  titleChanged?: boolean
  summaryChanged?: boolean
  bodyChanged?: boolean
  statusChanged?: boolean
  importanceChanged?: boolean
  [key: string]: unknown
}

export interface SourceTraceChatSource {
  date?: string
  messageId?: string
  title?: string
  preview?: string
  [key: string]: unknown
}

export interface SourceTraceObservationSource {
  observationId?: string
  title?: string
  preview?: string
  [key: string]: unknown
}

export interface SourceTraceRelatedPage {
  pageId: string
  title?: string
  pageType?: string
  [key: string]: unknown
}

export interface SourceTraceRelatedIssue {
  issueType?: string
  relatedPageId?: string
  message?: string
  [key: string]: unknown
}

export interface PageSourceTrace {
  page?: { relatedPageIds?: string[]; [key: string]: unknown }
  relatedPages?: SourceTraceRelatedPage[]
  chatSources?: SourceTraceChatSource[]
  observationSources?: SourceTraceObservationSource[]
  relatedIssues?: SourceTraceRelatedIssue[]
  [key: string]: unknown
}

export interface TopicSourceTrace {
  chatSources?: SourceTraceChatSource[]
  observationSources?: SourceTraceObservationSource[]
  [key: string]: unknown
}

export interface MemoryWikiConfirmation {
  id: string
  status?: string
  confirmRequest?: Record<string, unknown>
  [key: string]: unknown
}

export interface IdentityPageOption {
  pageId: string
  title: string
  pageType: string
  status?: string
}

export interface IdentityRelationshipCandidate extends IdentityPageOption {
  linked: boolean
}

export interface GovernanceEvidenceView {
  id: string
  summary: string
  body: string
}

/** 35 字段页面草稿（与 Vue 版 createEmptyPageForm 逐字段一致）。 */
export interface MemoryWikiPageForm {
  pageId: string
  pageType: string
  title: string
  userName: string
  preferredName: string
  cornieRelationship: string
  identitySummary: string
  lifeStageSummary: string
  currentFocus: string
  stressors: string
  communicationPreference: string
  personName: string
  relationshipToUser: string
  roleSummary: string
  personalitySummary: string
  sharedExperienceSummary: string
  emotionalWeight: string
  timelineSummary: string
  firstKnownPeriod: string
  preferenceType: string
  stance: string
  stabilityLevel: string
  traitType: string
  confidenceLevel: string
  traitSummary: string
  evidenceCount: number
  ownerConfirmed: boolean
  lastConfirmedAt: string
  triggerKeywordsText: string
  summary: string
  body: string
  aliasesText: string
  status: string
  importance: string
}

// 页面类型/状态筛选选项（列表面板与编辑面板共用同一份常量）。
export const MEMORY_PAGE_TYPE_OPTIONS = [
  'topic',
  'person',
  'event',
  'preference',
  'identity_profile',
  'identity_person',
  'identity_preference',
  'identity_trait',
] as const

export const MEMORY_PAGE_STATUS_OPTIONS = ['active', 'inactive', 'archived'] as const
export const MEMORY_IMPORTANCE_OPTIONS = ['low', 'medium', 'high', 'critical'] as const

// ─────────────────────────────────────────────────────────────────────────────
// 纯函数工具（错误文案映射 / slug 去重 / 证据摘要 / 响应收窄）
// ─────────────────────────────────────────────────────────────────────────────

function normalizeWorkspaceText(value: unknown): string {
  return String(value ?? '').trim()
}

/** 8 条后端错误串 → 中文文案映射（规格 §2.4）。 */
export function formatWorkspaceError(error: unknown, action = '处理长期记忆页面'): string {
  const rawMessage = (error as { message?: string } | null)?.message || String(error ?? '')
  const message = normalizeWorkspaceText(rawMessage)

  if (!message) return `${action}失败，请稍后再试`
  if (message.includes('memory wiki page already exists')) return '页面标题已存在，换一个吧'
  if (message.includes('invalid memory wiki frontmatter line')) return '文档结构损坏，暂时无法读取'
  if (message.includes('memory wiki page is missing frontmatter boundary')) return '缺少页面头信息，无法读取'
  if (message.includes('memory wiki page frontmatter is not closed')) return '页面头未闭合，无法读取'
  if (message.includes('unsupported memory wiki page type')) return '暂不支持该页面类型'
  if (message.includes('memory wiki page not found')) return '页面不存在或已被移动'
  if (message.includes('Failed to fetch')) return '无法连接后端服务'
  return message
}

/** 客户端重复标题守卫：lowercase、去引号、非法字符转 '-'、收缩连字符。 */
export function buildWorkspaceSlug(value: unknown): string {
  const normalized = normalizeWorkspaceText(value)
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || 'untitled'
}

function findDuplicatePageSummary(
  pages: MemoryWikiPage[],
  { pageId = '', pageType = '', title = '' }: { pageId?: string; pageType?: string; title?: string }
): MemoryWikiPage | null {
  const normalizedPageType = normalizeWorkspaceText(pageType)
  const targetSlug = buildWorkspaceSlug(title)
  if (!normalizedPageType || !targetSlug) return null

  return (
    pages.find((item) => {
      if (String(item.pageId || '') === String(pageId || '')) return false
      if (normalizeWorkspaceText(item.pageType) !== normalizedPageType) return false
      const itemSlug = buildWorkspaceSlug(item.slug || item.title || '')
      return itemSlug === targetSlug
    }) || null
  )
}

function splitCsvText(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatEvidence(item: unknown): string {
  try {
    return JSON.stringify(item, null, 2)
  } catch {
    return String(item)
  }
}

/** 证据摘要降级取值：issueType → duplicateScore → suggestion.action → 首键。 */
function buildEvidenceSummary(item: unknown, index: number): string {
  if (!item || typeof item !== 'object') return `证据 ${index + 1}`
  const record = item as Record<string, unknown>

  if (record.issueType) return `问题类型：${String(record.issueType)}`
  if (record.duplicateScore !== undefined) return `重复度：${String(record.duplicateScore)}`

  const suggestion = record.suggestion as { action?: unknown } | null | undefined
  if (suggestion && typeof suggestion === 'object' && suggestion.action) {
    return `建议动作：${String(suggestion.action)}`
  }

  const firstKey = Object.keys(record)[0]
  if (!firstKey) return `证据 ${index + 1}`
  return `${firstKey}：${String(record[firstKey])}`
}

export function createEmptyPageForm(): MemoryWikiPageForm {
  return {
    pageId: '',
    pageType: 'topic',
    title: '',
    userName: '',
    preferredName: '',
    cornieRelationship: '',
    identitySummary: '',
    lifeStageSummary: '',
    currentFocus: '',
    stressors: '',
    communicationPreference: '',
    personName: '',
    relationshipToUser: '',
    roleSummary: '',
    personalitySummary: '',
    sharedExperienceSummary: '',
    emotionalWeight: '',
    timelineSummary: '',
    firstKnownPeriod: '',
    preferenceType: '',
    stance: '',
    stabilityLevel: 'medium',
    traitType: '',
    confidenceLevel: 'low',
    traitSummary: '',
    evidenceCount: 0,
    ownerConfirmed: false,
    lastConfirmedAt: '',
    triggerKeywordsText: '',
    summary: '',
    body: '',
    aliasesText: '',
    status: 'active',
    importance: 'medium',
  }
}

function mapPageToForm(page: MemoryWikiPage): MemoryWikiPageForm {
  return {
    pageId: String(page.pageId ?? ''),
    pageType: String(page.pageType ?? 'topic'),
    title: String(page.title ?? ''),
    userName: String(page.userName ?? ''),
    preferredName: String(page.preferredName ?? ''),
    cornieRelationship: String(page.cornieRelationship ?? ''),
    identitySummary: String(page.identitySummary ?? ''),
    lifeStageSummary: String(page.lifeStageSummary ?? ''),
    currentFocus: String(page.currentFocus ?? ''),
    stressors: String(page.stressors ?? ''),
    communicationPreference: String(page.communicationPreference ?? ''),
    personName: String(page.personName ?? ''),
    relationshipToUser: String(page.relationshipToUser ?? ''),
    roleSummary: String(page.roleSummary ?? ''),
    personalitySummary: String(page.personalitySummary ?? ''),
    sharedExperienceSummary: String(page.sharedExperienceSummary ?? ''),
    emotionalWeight: String(page.emotionalWeight ?? ''),
    timelineSummary: String(page.timelineSummary ?? ''),
    firstKnownPeriod: String(page.firstKnownPeriod ?? ''),
    preferenceType: String(page.preferenceType ?? ''),
    stance: String(page.stance ?? ''),
    stabilityLevel: String(page.stabilityLevel ?? 'medium'),
    traitType: String(page.traitType ?? ''),
    confidenceLevel: String(page.confidenceLevel ?? 'low'),
    traitSummary: String(page.traitSummary ?? ''),
    evidenceCount: Number(page.evidenceCount ?? 0) || 0,
    ownerConfirmed: page.ownerConfirmed === true,
    lastConfirmedAt: String(page.lastConfirmedAt ?? ''),
    triggerKeywordsText: Array.isArray(page.triggerKeywords) ? page.triggerKeywords.map(String).join(', ') : '',
    summary: String(page.summary ?? ''),
    body: String(page.body ?? ''),
    aliasesText: Array.isArray(page.aliases) ? page.aliases.map(String).join(', ') : '',
    status: String(page.status ?? 'active'),
    importance: String(page.importance ?? 'medium'),
  }
}

// ── 响应收窄（api 层多数返回 unknown，多态处用 Record + 收窄） ──

function extractPage(data: Awaited<ReturnType<typeof getMemoryWikiPage>>): MemoryWikiPage | null {
  if (data && typeof data === 'object' && 'page' in data) {
    const nested = (data as { page?: unknown }).page
    return nested && typeof nested === 'object' ? (nested as MemoryWikiPage) : null
  }
  return (data as MemoryWikiPage | null) ?? null
}

function extractUnknownList(data: unknown, field: string): Array<Record<string, unknown>> {
  const items = (data as Record<string, unknown> | null)?.[field]
  return Array.isArray(items) ? (items as Array<Record<string, unknown>>) : []
}

function extractPageTrace(data: unknown): PageSourceTrace | null {
  const trace = (data as Record<string, unknown> | null)?.trace
  return trace && typeof trace === 'object' ? (trace as PageSourceTrace) : null
}

function extractTopicTrace(data: unknown): TopicSourceTrace | null {
  const trace = (data as Record<string, unknown> | null)?.trace
  return trace && typeof trace === 'object' ? (trace as TopicSourceTrace) : null
}

function extractTopicItem(data: unknown): TopicIndexItem | null {
  const item = (data as Record<string, unknown> | null)?.item
  if (!item || typeof item !== 'object') return null
  const raw = item as Record<string, unknown>
  return { ...(raw as TopicIndexItem), normalizedKey: String(raw.normalizedKey ?? '') }
}

function extractGovernanceItem(data: unknown): GovernanceDetail | null {
  const item = (data as Record<string, unknown> | null)?.item
  if (!item || typeof item !== 'object') return null
  const raw = item as Record<string, unknown>
  return { ...(raw as GovernanceDetail), requestId: String(raw.requestId ?? '') }
}

function extractVersionItems(data: unknown): PageVersionItem[] {
  return extractUnknownList(data, 'items').map((item, index) => ({
    ...(item as PageVersionItem),
    versionId: String(item.versionId ?? `version-${index}`),
  }))
}

function extractGovernanceItems(data: unknown): GovernanceQueueItem[] {
  return extractUnknownList(data, 'items').map((item, index) => ({
    ...(item as GovernanceQueueItem),
    requestId: String(item.requestId ?? `governance-${index}`),
  }))
}

function extractTopicItems(data: unknown): TopicIndexItem[] {
  return extractUnknownList(data, 'items').map((item, index) => ({
    ...(item as TopicIndexItem),
    normalizedKey: String(item.normalizedKey ?? `topic-${index}`),
  }))
}

function extractConfirmations(data: unknown): MemoryWikiConfirmation[] {
  const list = (data as Record<string, unknown> | null)?.confirmations
  if (!Array.isArray(list)) return []
  return (list as Array<Record<string, unknown>>).map((item, index) => ({
    ...(item as MemoryWikiConfirmation),
    id: String(item.id ?? `confirmation-${index}`),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// 编排状态机
// ─────────────────────────────────────────────────────────────────────────────

export function useMemoryWikiWorkspace() {
  const guard = useRequestGuard()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [pages, setPages] = useState<MemoryWikiPage[]>([])
  const [topicItems, setTopicItems] = useState<TopicIndexItem[]>([])
  const [governanceItems, setGovernanceItems] = useState<GovernanceQueueItem[]>([])
  const [confirmations, setConfirmations] = useState<MemoryWikiConfirmation[]>([])
  const [pageVersions, setPageVersions] = useState<PageVersionItem[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [versionDiff, setVersionDiff] = useState<VersionDiff | null>(null)
  const [pageSourceTrace, setPageSourceTrace] = useState<PageSourceTrace | null>(null)
  const [topicSourceTrace, setTopicSourceTrace] = useState<TopicSourceTrace | null>(null)

  const [selectedPageId, setSelectedPageId] = useState('')
  const [selectedTopicKey, setSelectedTopicKey] = useState('')
  const [selectedGovernanceId, setSelectedGovernanceId] = useState('')

  const [pageFilterType, setPageFilterType] = useState('')
  const [pageFilterStatus, setPageFilterStatus] = useState('')
  const [governanceFilterStatus, setGovernanceFilterStatus] = useState('pending')
  const [governanceFilterSection, setGovernanceFilterSection] = useState('')
  const [confirmationFilterStatus, setConfirmationFilterStatus] = useState('pending')

  const [pageForm, setPageForm] = useState<MemoryWikiPageForm>(createEmptyPageForm)
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null)
  const [governanceDetail, setGovernanceDetail] = useState<GovernanceDetail | null>(null)
  const [pageTopicKeyword, setPageTopicKeyword] = useState('')
  const [pageTopicAliasesText, setPageTopicAliasesText] = useState('')
  const [pageTopicNote, setPageTopicNote] = useState('')
  const [relatedPageSelection, setRelatedPageSelection] = useState<string[]>([])
  const [confirmStatusMap, setConfirmStatusMap] = useState<Record<string, string>>({})
  const [confirmErrorMap, setConfirmErrorMap] = useState<Record<string, string>>({})

  // ref 镜像（useChat 模式）：异步 await 点之间读取最新值，避免闭包陈旧状态。
  const pagesRef = useRef(pages)
  pagesRef.current = pages
  const pageFormRef = useRef(pageForm)
  pageFormRef.current = pageForm
  const topicDetailRef = useRef(topicDetail)
  topicDetailRef.current = topicDetail
  const selectedGovernanceIdRef = useRef(selectedGovernanceId)
  selectedGovernanceIdRef.current = selectedGovernanceId
  const selectedVersionIdRef = useRef(selectedVersionId)
  selectedVersionIdRef.current = selectedVersionId
  const relatedPageSelectionRef = useRef(relatedPageSelection)
  relatedPageSelectionRef.current = relatedPageSelection
  const pageTopicKeywordRef = useRef(pageTopicKeyword)
  pageTopicKeywordRef.current = pageTopicKeyword
  const pageTopicAliasesTextRef = useRef(pageTopicAliasesText)
  pageTopicAliasesTextRef.current = pageTopicAliasesText
  const pageTopicNoteRef = useRef(pageTopicNote)
  pageTopicNoteRef.current = pageTopicNote
  const pageFilterTypeRef = useRef(pageFilterType)
  pageFilterTypeRef.current = pageFilterType
  const pageFilterStatusRef = useRef(pageFilterStatus)
  pageFilterStatusRef.current = pageFilterStatus
  const governanceFilterStatusRef = useRef(governanceFilterStatus)
  governanceFilterStatusRef.current = governanceFilterStatus
  const governanceFilterSectionRef = useRef(governanceFilterSection)
  governanceFilterSectionRef.current = governanceFilterSection
  const confirmationFilterStatusRef = useRef(confirmationFilterStatus)
  confirmationFilterStatusRef.current = confirmationFilterStatus

  // ── 刷新（overrides 让"先改筛选再刷新"不依赖尚未提交的 state） ──
  const refreshPages = useCallback(async (overrides?: { pageType?: string; status?: string }): Promise<void> => {
    const data = await listMemoryWikiPages({
      pageType: (overrides?.pageType ?? pageFilterTypeRef.current) || undefined,
      status: (overrides?.status ?? pageFilterStatusRef.current) || undefined,
    })
    setPages(data.items || [])
  }, [])

  const refreshTopicItems = useCallback(async (): Promise<void> => {
    const data = await listTopicIndexItems()
    setTopicItems(extractTopicItems(data))
  }, [])

  const refreshGovernanceItems = useCallback(
    async (overrides?: { status?: string; queueSection?: string }): Promise<void> => {
      const data = await listMemoryWikiGovernanceRequests({
        status: (overrides?.status ?? governanceFilterStatusRef.current) || undefined,
        queueSection: (overrides?.queueSection ?? governanceFilterSectionRef.current) || undefined,
      })
      const items = extractGovernanceItems(data)
      setGovernanceItems(items)

      // 详情跟随列表：选中项被筛掉即清空，避免悬挂详情（规格 §6.2）。
      const currentSelected = selectedGovernanceIdRef.current
      if (currentSelected && !items.some((item) => item.requestId === currentSelected)) {
        setGovernanceDetail(null)
        setSelectedGovernanceId('')
      }
    },
    []
  )

  const refreshConfirmations = useCallback(async (overrides?: { status?: string }): Promise<void> => {
    const data = await listConfirmations({
      status: (overrides?.status ?? confirmationFilterStatusRef.current) || undefined,
    })
    setConfirmations(extractConfirmations(data))
  }, [])

  const refreshAll = useCallback(async (): Promise<void> => {
    setLoading(true)
    setErrorMsg('')
    try {
      await Promise.all([refreshPages(), refreshTopicItems(), refreshGovernanceItems(), refreshConfirmations()])
    } catch (error) {
      setErrorMsg(formatWorkspaceError(error, '加载长期记忆工作台'))
    } finally {
      setLoading(false)
    }
  }, [refreshPages, refreshTopicItems, refreshGovernanceItems, refreshConfirmations])

  // ── 选中流（全部接竞态守卫：旧响应不得覆盖新选中，规格风险点 1） ──
  const selectPage = useCallback(
    async (pageId: string): Promise<void> => {
      const { token } = guard.begin('page')
      setLoading(true)
      setErrorMsg('')
      try {
        setSelectedPageId(pageId)
        const [pageData, versionData] = await Promise.all([
          getMemoryWikiPage(pageId),
          listMemoryWikiPageVersions(pageId),
        ])
        if (!guard.isCurrent('page', token)) return

        const page = extractPage(pageData)
        if (!page) throw new Error('memory wiki page not found')
        setPageVersions(extractVersionItems(versionData))
        setSelectedVersionId('')
        setVersionDiff(null)
        setPageSourceTrace(null)
        setPageForm(mapPageToForm(page))
        setPageTopicKeyword(String(page.title ?? ''))
        setPageTopicAliasesText(Array.isArray(page.aliases) ? page.aliases.map(String).join(', ') : '')
        setPageTopicNote(String(page.summary ?? ''))

        const traceData = await getMemoryWikiPageSourceTrace(pageId)
        if (!guard.isCurrent('page', token)) return
        const trace = extractPageTrace(traceData)
        setPageSourceTrace(trace)
        setRelatedPageSelection(Array.isArray(trace?.page?.relatedPageIds) ? [...trace.page.relatedPageIds] : [])
      } catch (error) {
        if (guard.isCurrent('page', token)) setErrorMsg(formatWorkspaceError(error, '读取页面详情'))
      } finally {
        if (guard.isCurrent('page', token)) setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const selectTopic = useCallback(
    async (normalizedKey: string): Promise<void> => {
      const { token } = guard.begin('topic')
      setLoading(true)
      setErrorMsg('')
      try {
        setSelectedTopicKey(normalizedKey)
        const data = await getTopicIndexItem(normalizedKey)
        const traceData = await getTopicIndexSourceTrace(normalizedKey)
        if (!guard.isCurrent('topic', token)) return

        const item = (data as Record<string, unknown> | null)?.item
        if (!item || typeof item !== 'object') throw new Error('topic index item not found')
        const raw = item as Record<string, unknown>
        setTopicDetail({
          ...(extractTopicItem(data) as TopicIndexItem),
          aliasesText: Array.isArray(raw.aliases) ? raw.aliases.map(String).join(', ') : '',
        })
        setTopicSourceTrace(extractTopicTrace(traceData))
      } catch (error) {
        if (guard.isCurrent('topic', token)) setErrorMsg(formatWorkspaceError(error, '读取主题索引'))
      } finally {
        if (guard.isCurrent('topic', token)) setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const selectGovernance = useCallback(
    async (requestId: string): Promise<void> => {
      const { token } = guard.begin('governance')
      setLoading(true)
      setErrorMsg('')
      try {
        setSelectedGovernanceId(requestId)
        const data = await getMemoryWikiGovernanceRequest(requestId)
        if (!guard.isCurrent('governance', token)) return
        setGovernanceDetail(extractGovernanceItem(data))
      } catch (error) {
        if (guard.isCurrent('governance', token)) setErrorMsg(formatWorkspaceError(error, '读取治理请求'))
      } finally {
        if (guard.isCurrent('governance', token)) setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const resetPageForm = useCallback((): void => {
    setSelectedPageId('')
    setPageVersions([])
    setSelectedVersionId('')
    setVersionDiff(null)
    setPageForm(createEmptyPageForm())
    setPageTopicKeyword('')
    setPageTopicAliasesText('')
    setPageTopicNote('')
    setRelatedPageSelection([])
    setPageSourceTrace(null)
  }, [])

  const selectVersion = useCallback(
    async (versionId: string): Promise<void> => {
      const pageId = pageFormRef.current.pageId
      if (!pageId || !versionId) return
      const { token } = guard.begin('version')
      setLoading(true)
      setErrorMsg('')
      try {
        setSelectedVersionId(versionId)
        // 458：对比"所选历史版本 vs 当前页"，修复此前版本自比（恒为无变更）。
        const data = await getMemoryWikiPageVersionDiff(pageId, {
          fromVersionId: versionId,
          toVersionId: 'current',
        })
        if (!guard.isCurrent('version', token)) return
        const diff = (data as Record<string, unknown> | null)?.diff
        setVersionDiff(diff && typeof diff === 'object' ? (diff as VersionDiff) : null)
      } catch (error) {
        if (guard.isCurrent('version', token)) setErrorMsg(formatWorkspaceError(error, '读取版本差异'))
      } finally {
        if (guard.isCurrent('version', token)) setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // ── 写入流（全部"改完刷新"，无乐观更新，除确认流） ──
  const savePage = useCallback(async (): Promise<void> => {
    setSaving(true)
    setErrorMsg('')
    try {
      const form = pageFormRef.current
      const title = normalizeWorkspaceText(form.title)
      if (!title) throw new Error('请先填写页面标题。')

      const duplicatePage = findDuplicatePageSummary(pagesRef.current, {
        pageId: form.pageId,
        pageType: form.pageType,
        title,
      })
      if (duplicatePage) {
        throw new Error(`页面标题重复：已存在“${duplicatePage.title || duplicatePage.pageId}”，请换一个标题。`)
      }

      const payload = {
        pageType: form.pageType,
        title,
        userName: form.userName,
        preferredName: form.preferredName,
        cornieRelationship: form.cornieRelationship,
        identitySummary: form.identitySummary,
        lifeStageSummary: form.lifeStageSummary,
        currentFocus: form.currentFocus,
        stressors: form.stressors,
        communicationPreference: form.communicationPreference,
        personName: form.personName,
        relationshipToUser: form.relationshipToUser,
        roleSummary: form.roleSummary,
        personalitySummary: form.personalitySummary,
        sharedExperienceSummary: form.sharedExperienceSummary,
        emotionalWeight: form.emotionalWeight,
        timelineSummary: form.timelineSummary,
        firstKnownPeriod: form.firstKnownPeriod,
        preferenceType: form.preferenceType,
        stance: form.stance,
        stabilityLevel: form.stabilityLevel,
        traitType: form.traitType,
        confidenceLevel: form.confidenceLevel,
        traitSummary: form.traitSummary,
        evidenceCount: Number(form.evidenceCount) || 0,
        ownerConfirmed: form.ownerConfirmed === true,
        lastConfirmedAt: form.lastConfirmedAt,
        triggerKeywords: splitCsvText(form.triggerKeywordsText),
        summary: form.summary,
        body: form.body,
      }

      let finalPageId = form.pageId
      if (form.pageId) {
        await updateMemoryWikiPage(form.pageId, payload)
      } else {
        const created = (await createMemoryWikiPage(payload)) as Record<string, unknown> | null
        const createdPageId = (created?.page as Record<string, unknown> | undefined)?.pageId
        finalPageId = createdPageId === undefined || createdPageId === null ? '' : String(createdPageId)
        if (!finalPageId) throw new Error('创建成功但未返回页面 ID，请刷新后查看')
        setSelectedPageId(finalPageId)
      }

      if (finalPageId) {
        // 串行四连写：aliases → status → importance → 重拉详情（契约保真）。
        await updateMemoryWikiAliases(finalPageId, splitCsvText(form.aliasesText))
        await setMemoryWikiStatus(finalPageId, form.status)
        await setMemoryWikiImportance(finalPageId, form.importance)
        await selectPage(finalPageId)
      }

      await refreshPages()
      await refreshTopicItems()
    } catch (error) {
      setErrorMsg(formatWorkspaceError(error, pageFormRef.current.pageId ? '保存页面' : '创建页面'))
    } finally {
      setSaving(false)
    }
  }, [selectPage, refreshPages, refreshTopicItems])

  const archivePage = useCallback(async (): Promise<void> => {
    const pageId = pageFormRef.current.pageId
    if (!pageId) return
    setSaving(true)
    setErrorMsg('')
    try {
      await archiveMemoryWikiPage(pageId)
      await refreshPages()
      await selectPage(pageId)
    } catch (error) {
      setErrorMsg(formatWorkspaceError(error, '归档页面'))
    } finally {
      setSaving(false)
    }
  }, [selectPage, refreshPages])

  const restorePage = useCallback(async (): Promise<void> => {
    const pageId = pageFormRef.current.pageId
    if (!pageId) return
    setSaving(true)
    setErrorMsg('')
    try {
      await restoreMemoryWikiPage(pageId)
      await refreshPages()
      await selectPage(pageId)
    } catch (error) {
      setErrorMsg(formatWorkspaceError(error, '恢复页面'))
    } finally {
      setSaving(false)
    }
  }, [selectPage, refreshPages])

  const rollbackPage = useCallback(async (): Promise<void> => {
    const form = pageFormRef.current
    if (!form.pageId || !selectedVersionIdRef.current) return
    setSaving(true)
    setErrorMsg('')
    try {
      await rollbackMemoryWikiPage(form.pageId, selectedVersionIdRef.current)
      await refreshPages()
      await selectPage(form.pageId)
    } catch (error) {
      setErrorMsg(formatWorkspaceError(error, '回滚页面'))
    } finally {
      setSaving(false)
    }
  }, [selectPage, refreshPages])

  const saveTopicAliases = useCallback(async (): Promise<void> => {
    const detail = topicDetailRef.current
    if (!detail?.normalizedKey) return
    setSaving(true)
    setErrorMsg('')
    try {
      await updateTopicIndexAliases(detail.normalizedKey, splitCsvText(detail.aliasesText))
      await refreshTopicItems()
      await selectTopic(detail.normalizedKey)
    } catch (error) {
      setErrorMsg(formatWorkspaceError(error, '保存主题别名'))
    } finally {
      setSaving(false)
    }
  }, [selectTopic, refreshTopicItems])

  const saveRelatedPages = useCallback(async (): Promise<void> => {
    const pageId = pageFormRef.current.pageId
    if (!pageId) return
    setSaving(true)
    setErrorMsg('')
    try {
      const relatedPageIds = Array.from(
        new Set(relatedPageSelectionRef.current.map((item) => String(item).trim()).filter(Boolean))
      )
      await linkMemoryWikiRelatedPages(pageId, relatedPageIds)
      await refreshPages()
      await selectPage(pageId)
    } catch (error) {
      setErrorMsg(formatWorkspaceError(error, '保存页面关联'))
    } finally {
      setSaving(false)
    }
  }, [selectPage, refreshPages])

  const linkSelectedPageToTopic = useCallback(async (): Promise<void> => {
    const form = pageFormRef.current
    if (!form.pageId || !normalizeWorkspaceText(pageTopicKeywordRef.current)) return
    setSaving(true)
    setErrorMsg('')
    try {
      const keyword = normalizeWorkspaceText(pageTopicKeywordRef.current)
      await linkMemoryWikiPageToTopic(form.pageId, {
        keyword,
        aliases: splitCsvText(pageTopicAliasesTextRef.current),
        note: normalizeWorkspaceText(pageTopicNoteRef.current),
        importance: form.importance,
      })
      await refreshPages()
      await refreshTopicItems()
      await selectPage(form.pageId)
      // normalizedKey 约定小写（规格 §6.1 隐式契约）。
      await selectTopic(keyword.toLowerCase())
    } catch (error) {
      setErrorMsg(formatWorkspaceError(error, '绑定主题索引'))
    } finally {
      setSaving(false)
    }
  }, [selectPage, selectTopic, refreshPages, refreshTopicItems])

  const runInspectionScan = useCallback(async (): Promise<void> => {
    setSaving(true)
    setErrorMsg('')
    try {
      await enqueueMemoryWikiInspectionScan()
      await refreshGovernanceItems()
    } catch (error) {
      setErrorMsg(formatWorkspaceError(error, '发起巡检'))
    } finally {
      setSaving(false)
    }
  }, [refreshGovernanceItems])

  const changeGovernanceStatus = useCallback(
    async (requestId: string, status: string): Promise<void> => {
      setSaving(true)
      setErrorMsg('')
      try {
        await updateMemoryWikiGovernanceRequestStatus(requestId, status)
        await refreshGovernanceItems()
        if (selectedGovernanceIdRef.current === requestId) {
          await selectGovernance(requestId)
        }
      } catch (error) {
        setErrorMsg(formatWorkspaceError(error, '更新治理请求状态'))
      } finally {
        setSaving(false)
      }
    },
    [selectGovernance, refreshGovernanceItems]
  )

  // 唯一的逐项乐观更新：置 'processing' 占位，服务端结果/失败覆盖。
  const handleConfirmationAction = useCallback(
    async (action: 'approve' | 'reject', confirmation: MemoryWikiConfirmation): Promise<void> => {
      const id = confirmation?.id
      if (!id) return
      setConfirmStatusMap((prev) => ({ ...prev, [id]: 'processing' }))
      setConfirmErrorMap((prev) => ({ ...prev, [id]: '' }))

      try {
        const result = (await submitConfirmationDecision(id, action)) as Record<string, unknown> | null
        const status = ((result?.confirmation as { status?: string } | undefined)?.status ||
          (result?.followupConfirmation as { status?: string } | undefined)?.status ||
          (action === 'approve' ? 'approved' : 'rejected')) as string
        setConfirmStatusMap((prev) => ({ ...prev, [id]: status }))
        await refreshConfirmations()
      } catch (error) {
        setConfirmStatusMap((prev) => ({ ...prev, [id]: 'failed' }))
        setConfirmErrorMap((prev) => ({
          ...prev,
          [id]: (error as { message?: string } | null)?.message || String(error),
        }))
      }
    },
    [refreshConfirmations]
  )

  // ── 派生 computed（业务规则随状态机一并迁移） ──
  const selectedPage = useMemo(
    () => pages.find((item) => item.pageId === selectedPageId) || null,
    [pages, selectedPageId]
  )
  const selectedVersion = useMemo(
    () => pageVersions.find((item) => item.versionId === selectedVersionId) || null,
    [pageVersions, selectedVersionId]
  )
  const governanceSections = useMemo(
    () =>
      Array.from(
        new Set(governanceItems.map((item) => item.queueSection).filter((value): value is string => Boolean(value)))
      ),
    [governanceItems]
  )
  const pendingGovernanceCount = useMemo(
    () => governanceItems.filter((item) => item.status === 'pending').length,
    [governanceItems]
  )
  const pendingConfirmationCount = useMemo(
    () => confirmations.filter((item) => item.status === 'pending').length,
    [confirmations]
  )
  const governanceFilterSummary = useMemo(() => {
    const statusLabel = governanceFilterStatus || '全部状态'
    const sectionLabel = governanceFilterSection || '全部分区'
    return `${statusLabel} · ${sectionLabel} · ${governanceItems.length} 条结果`
  }, [governanceFilterStatus, governanceFilterSection, governanceItems])
  const governanceEvidenceItems = useMemo<GovernanceEvidenceView[]>(() => {
    if (!Array.isArray(governanceDetail?.evidence)) return []
    return (governanceDetail?.evidence ?? []).map((item, index) => ({
      id: `${governanceDetail?.requestId || 'gov'}-${index}`,
      summary: buildEvidenceSummary(item, index),
      body: formatEvidence(item),
    }))
  }, [governanceDetail])
  const governanceSuggestedActions = useMemo<string[]>(() => {
    const payload = governanceDetail?.payload
    if (!payload || typeof payload !== 'object') return []
    return Object.entries(payload)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
      .map(([key, value]) => `${key}：${String(value)}`)
  }, [governanceDetail])

  const identityPageOptions = useMemo<IdentityPageOption[]>(
    () =>
      pages
        .filter((item) => item.pageId !== pageForm.pageId)
        .filter((item) => String(item.pageType || '').startsWith('identity_'))
        .map((item) => ({
          pageId: item.pageId,
          title: item.title || item.pageId,
          pageType: String(item.pageType || ''),
          status: item.status === undefined || item.status === null ? undefined : String(item.status),
        })),
    [pages, pageForm.pageId]
  )

  const selectedRelatedPageIds = useMemo<string[]>(
    () =>
      Array.isArray(pageSourceTrace?.page?.relatedPageIds) ? (pageSourceTrace.page.relatedPageIds as string[]) : [],
    [pageSourceTrace]
  )

  const relatedPageMap = useMemo(() => {
    const map = new Map<string, SourceTraceRelatedPage>()
    for (const item of pageSourceTrace?.relatedPages ?? []) {
      map.set(item.pageId, item)
    }
    return map
  }, [pageSourceTrace])

  const identityRelationshipRules = useMemo<string[]>(() => {
    const pageType = pageForm.pageType
    if (pageType === 'identity_profile') {
      return [
        '建议关联 identity_person：重要人物、关系对象、亲密联系人。',
        '建议关联 identity_preference：稳定偏好、忌讳、表达方式偏好。',
        '建议关联 identity_trait：性格倾向、情绪模式、压力反应。',
      ]
    }
    if (pageType === 'identity_person') {
      return [
        '建议至少关联一个 identity_profile：说明这个人物属于谁的人际网络。',
        '必要时关联 identity_trait：记录这个人物和主人的互动特征或关系状态。',
      ]
    }
    if (pageType === 'identity_preference') {
      return [
        '建议至少关联一个 identity_profile：偏好应归属于具体的人。',
        '如偏好与某人物强相关，也可额外关联 identity_person。',
      ]
    }
    if (pageType === 'identity_trait') {
      return [
        '建议至少关联一个 identity_profile： trait 应说明是在描写谁。',
        '如 trait 与特定人物关系有关，也可关联 identity_person。',
      ]
    }
    return []
  }, [pageForm.pageType])

  const identityRelationshipCandidates = useMemo<IdentityRelationshipCandidate[]>(() => {
    const pageType = pageForm.pageType
    const selectedIds = new Set(selectedRelatedPageIds)
    const recommendTypes =
      pageType === 'identity_profile'
        ? ['identity_person', 'identity_preference', 'identity_trait']
        : pageType === 'identity_person'
          ? ['identity_profile', 'identity_trait']
          : pageType === 'identity_preference' || pageType === 'identity_trait'
            ? ['identity_profile', 'identity_person']
            : []

    return identityPageOptions
      .filter((item) => recommendTypes.includes(item.pageType))
      .map((item) => ({ ...item, linked: selectedIds.has(item.pageId) }))
  }, [identityPageOptions, pageForm.pageType, selectedRelatedPageIds])

  const identityRelationshipWarnings = useMemo<string[]>(() => {
    const pageType = pageForm.pageType
    if (!String(pageType || '').startsWith('identity_') || !pageForm.pageId) return []

    const linkedTypes = new Set(
      selectedRelatedPageIds
        .map((pageId) => relatedPageMap.get(pageId)?.pageType)
        .filter((type): type is string => Boolean(type))
    )
    const warnings: string[] = []

    if (pageType === 'identity_person' && !linkedTypes.has('identity_profile')) {
      warnings.push('这个人物页还没有挂到任何 identity_profile，下次回忆人物关系时可能比较难自动归位。')
    }
    if (pageType === 'identity_preference' && !linkedTypes.has('identity_profile')) {
      warnings.push('这个偏好页还没有明确属于谁，建议至少关联一个 identity_profile。')
    }
    if (pageType === 'identity_trait' && !linkedTypes.has('identity_profile')) {
      warnings.push('这个 trait 页还没有明确描写对象，建议至少关联一个 identity_profile。')
    }
    if (pageType === 'identity_profile' && selectedRelatedPageIds.length === 0) {
      warnings.push('这个 identity_profile 还是孤立页，建议补上人物、偏好或 trait 链路。')
    }

    return warnings
  }, [pageForm.pageType, pageForm.pageId, selectedRelatedPageIds, relatedPageMap])

  const relatedPageIssues = useMemo<SourceTraceRelatedIssue[]>(
    () => (Array.isArray(pageSourceTrace?.relatedIssues) ? pageSourceTrace.relatedIssues : []),
    [pageSourceTrace]
  )

  // ── 挂载 + memory 域信号自动刷新 ──
  useEffect(() => {
    void refreshAll()
    const stopListening = listenDataChanged((detail) => {
      if ((detail as { memory?: boolean } | null)?.memory) void refreshAll()
    })
    return () => {
      stopListening()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    // 全局标志
    loading,
    saving,
    errorMsg,
    // 数据集合
    pages,
    topicItems,
    governanceItems,
    confirmations,
    pageVersions,
    selectedVersionId,
    versionDiff,
    pageSourceTrace,
    topicSourceTrace,
    // 选中态
    selectedPageId,
    selectedTopicKey,
    selectedGovernanceId,
    // 筛选态
    pageFilterType,
    pageFilterStatus,
    governanceFilterStatus,
    governanceFilterSection,
    confirmationFilterStatus,
    // 草稿态
    pageForm,
    topicDetail,
    governanceDetail,
    pageTopicKeyword,
    pageTopicAliasesText,
    pageTopicNote,
    relatedPageSelection,
    confirmStatusMap,
    confirmErrorMap,
    // 派生值
    selectedPage,
    selectedVersion,
    governanceSections,
    pendingGovernanceCount,
    pendingConfirmationCount,
    governanceFilterSummary,
    governanceEvidenceItems,
    governanceSuggestedActions,
    identityPageOptions,
    identityRelationshipRules,
    identityRelationshipCandidates,
    identityRelationshipWarnings,
    relatedPageIssues,
    // 刷新
    refreshPages,
    refreshTopicItems,
    refreshGovernanceItems,
    refreshConfirmations,
    refreshAll,
    // 选中
    selectPage,
    selectTopic,
    selectGovernance,
    selectVersion,
    resetPageForm,
    // 写入
    savePage,
    archivePage,
    restorePage,
    rollbackPage,
    saveTopicAliases,
    saveRelatedPages,
    linkSelectedPageToTopic,
    runInspectionScan,
    changeGovernanceStatus,
    handleConfirmationAction,
    // 草稿/筛选 setter（面板受控编辑用）
    setPageForm,
    setTopicDetail,
    setPageTopicKeyword,
    setPageTopicAliasesText,
    setPageTopicNote,
    setRelatedPageSelection,
    setPageFilterType,
    setPageFilterStatus,
    setGovernanceFilterStatus,
    setGovernanceFilterSection,
    setConfirmationFilterStatus,
  }
}
