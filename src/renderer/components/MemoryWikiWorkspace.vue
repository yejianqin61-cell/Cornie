<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  archiveMemoryWikiPage,
  createMemoryWikiPage,
  enqueueMemoryWikiInspectionScan,
  getMemoryWikiPage,
  getMemoryWikiPageSourceTrace,
  getMemoryWikiPageVersionDiff,
  getMemoryWikiGovernanceRequest,
  getTopicIndexItem,
  getTopicIndexSourceTrace,
  linkMemoryWikiPageToTopic,
  listConfirmations,
  listMemoryWikiPageVersions,
  listMemoryWikiGovernanceRequests,
  listMemoryWikiPages,
  listTopicIndexItems,
  restoreMemoryWikiPage,
  rollbackMemoryWikiPage,
  setMemoryWikiImportance,
  setMemoryWikiStatus,
  submitConfirmationDecision,
  linkMemoryWikiRelatedPages,
  updateMemoryWikiAliases,
  updateMemoryWikiGovernanceRequestStatus,
  updateMemoryWikiPage,
  updateTopicIndexAliases,
} from '../api'
// FE-09：工作台按职责拆分——各区块独立组件，本文件只做组合与状态协调。
import MemoryWikiConfirmationPanel from './MemoryWikiConfirmationPanel.vue'
import MemoryWikiGovernanceDetailPanel from './MemoryWikiGovernanceDetailPanel.vue'
import MemoryWikiGovernanceQueuePanel from './MemoryWikiGovernanceQueuePanel.vue'
import MemoryWikiPageEditorPanel from './MemoryWikiPageEditorPanel.vue'
import MemoryWikiPageListPanel from './MemoryWikiPageListPanel.vue'
import MemoryWikiTopicIndexPanel from './MemoryWikiTopicIndexPanel.vue'
import MemoryWikiVersionPanel from './MemoryWikiVersionPanel.vue'
import MemoryWikiWorkspaceHead from './MemoryWikiWorkspaceHead.vue'

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')

const pages = ref([])
const topicItems = ref([])
const governanceItems = ref([])
const confirmations = ref([])
const pageVersions = ref([])
const selectedVersionId = ref('')
const versionDiff = ref(null)
const pageSourceTrace = ref(null)
const topicSourceTrace = ref(null)

const selectedPageId = ref('')
const selectedTopicKey = ref('')
const selectedGovernanceId = ref('')

const pageFilterType = ref('')
const pageFilterStatus = ref('')
const governanceFilterStatus = ref('pending')
const governanceFilterSection = ref('')
const confirmationFilterStatus = ref('pending')

const pageForm = ref(createEmptyPageForm())
const topicDetail = ref(null)
const governanceDetail = ref(null)
const pageTopicKeyword = ref('')
const pageTopicAliasesText = ref('')
const pageTopicNote = ref('')
const relatedPageSelection = ref([])
const confirmStatusMap = ref({})
const confirmErrorMap = ref({})

function createEmptyPageForm() {
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

const selectedPage = computed(() => pages.value.find((item) => item.pageId === selectedPageId.value) || null)
const selectedVersion = computed(
  () => pageVersions.value.find((item) => item.versionId === selectedVersionId.value) || null
)
const governanceSections = computed(() =>
  Array.from(new Set(governanceItems.value.map((item) => item.queueSection).filter(Boolean)))
)
const pendingGovernanceCount = computed(() => governanceItems.value.filter((item) => item.status === 'pending').length)
const pendingConfirmationCount = computed(() => confirmations.value.filter((item) => item.status === 'pending').length)
const governanceFilterSummary = computed(() => {
  const statusLabel = governanceFilterStatus.value || '全部状态'
  const sectionLabel = governanceFilterSection.value || '全部分区'
  return `${statusLabel} · ${sectionLabel} · ${governanceItems.value.length} 条结果`
})
const governanceEvidenceItems = computed(() => {
  if (!Array.isArray(governanceDetail.value?.evidence)) return []
  return governanceDetail.value.evidence.map((item, index) => ({
    id: `${governanceDetail.value?.requestId || 'gov'}-${index}`,
    summary: buildEvidenceSummary(item, index),
    body: formatEvidence(item),
  }))
})
const governanceSuggestedActions = computed(() => {
  const payload = governanceDetail.value?.payload
  if (!payload || typeof payload !== 'object') return []
  return Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => `${key}：${String(value)}`)
})
const identityPageOptions = computed(() =>
  pages.value
    .filter((item) => item.pageId !== pageForm.value.pageId)
    .filter((item) => String(item.pageType || '').startsWith('identity_'))
    .map((item) => ({
      pageId: item.pageId,
      title: item.title || item.pageId,
      pageType: item.pageType,
      status: item.status,
    }))
)
const selectedRelatedPageIds = computed(() =>
  Array.isArray(pageSourceTrace.value?.page?.relatedPageIds) ? pageSourceTrace.value.page.relatedPageIds : []
)
const relatedPageMap = computed(() => {
  const map = new Map()
  for (const item of pageSourceTrace.value?.relatedPages || []) {
    map.set(item.pageId, item)
  }
  return map
})
const identityRelationshipRules = computed(() => {
  const pageType = pageForm.value.pageType
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
})
const identityRelationshipCandidates = computed(() => {
  const pageType = pageForm.value.pageType
  const selectedIds = new Set(selectedRelatedPageIds.value)
  const options = identityPageOptions.value
  const recommendTypes =
    pageType === 'identity_profile'
      ? ['identity_person', 'identity_preference', 'identity_trait']
      : pageType === 'identity_person'
        ? ['identity_profile', 'identity_trait']
        : pageType === 'identity_preference' || pageType === 'identity_trait'
          ? ['identity_profile', 'identity_person']
          : []

  return options
    .filter((item) => recommendTypes.includes(item.pageType))
    .map((item) => ({
      ...item,
      linked: selectedIds.has(item.pageId),
    }))
})
const identityRelationshipWarnings = computed(() => {
  const pageType = pageForm.value.pageType
  if (!String(pageType || '').startsWith('identity_') || !pageForm.value.pageId) return []

  const linkedTypes = new Set(
    selectedRelatedPageIds.value.map((pageId) => relatedPageMap.value.get(pageId)?.pageType).filter(Boolean)
  )
  const warnings = []

  if (pageType === 'identity_person' && !linkedTypes.has('identity_profile')) {
    warnings.push('这个人物页还没有挂到任何 identity_profile，下次回忆人物关系时可能比较难自动归位。')
  }
  if (pageType === 'identity_preference' && !linkedTypes.has('identity_profile')) {
    warnings.push('这个偏好页还没有明确属于谁，建议至少关联一个 identity_profile。')
  }
  if (pageType === 'identity_trait' && !linkedTypes.has('identity_profile')) {
    warnings.push('这个 trait 页还没有明确描写对象，建议至少关联一个 identity_profile。')
  }
  if (pageType === 'identity_profile' && selectedRelatedPageIds.value.length === 0) {
    warnings.push('这个 identity_profile 还是孤立页，建议补上人物、偏好或 trait 链路。')
  }

  return warnings
})
const relatedPageIssues = computed(() =>
  Array.isArray(pageSourceTrace.value?.relatedIssues) ? pageSourceTrace.value.relatedIssues : []
)

function formatWorkspaceError(error, action = '处理长期记忆页面') {
  const rawMessage = error?.message || String(error || '')
  const message = String(rawMessage || '').trim()

  if (!message) {
    return `${action}时出了点小问题，请稍后再试一次。`
  }

  if (message.includes('memory wiki page already exists')) {
    return '这个页面标题已经存在了，请换一个标题，或者先看看列表里是不是已经有同名页面。'
  }

  if (message.includes('invalid memory wiki frontmatter line')) {
    return '有一页长期记忆文档的结构已经损坏，工作台暂时无法完整读取。请先修复那一页，再继续创建或编辑。'
  }

  if (message.includes('memory wiki page is missing frontmatter boundary')) {
    return '有一页长期记忆文档缺少必要的页面头信息，工作台目前没法正确读取它。'
  }

  if (message.includes('memory wiki page frontmatter is not closed')) {
    return '有一页长期记忆文档的页面头信息没有正确结束，工作台暂时无法读取。'
  }

  if (message.includes('unsupported memory wiki page type')) {
    return '当前页面类型暂时不被支持，请重新选择页面类型后再试。'
  }

  if (message.includes('memory wiki page not found')) {
    return '这页长期记忆可能已经被删除或移动了，刷新列表后再试一次吧。'
  }

  if (message.includes('Failed to fetch')) {
    return '暂时连不上长期记忆服务，请确认应用后端已经正常启动。'
  }

  return message
}

function normalizeWorkspaceText(value) {
  return String(value ?? '').trim()
}

function buildWorkspaceSlug(value) {
  const normalized = normalizeWorkspaceText(value)
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || 'untitled'
}

function findDuplicatePageSummary({ pageId = '', pageType = '', title = '' } = {}) {
  const normalizedPageType = normalizeWorkspaceText(pageType)
  const targetSlug = buildWorkspaceSlug(title)

  if (!normalizedPageType || !targetSlug) return null

  return (
    pages.value.find((item) => {
      if (String(item.pageId || '') === String(pageId || '')) return false
      if (normalizeWorkspaceText(item.pageType) !== normalizedPageType) return false
      const itemSlug = buildWorkspaceSlug(item.slug || item.title || '')
      return itemSlug === targetSlug
    }) || null
  )
}

async function refreshPages() {
  const data = await listMemoryWikiPages({
    pageType: pageFilterType.value || undefined,
    status: pageFilterStatus.value || undefined,
  })
  pages.value = data.items || []
}

async function refreshTopicItems() {
  const data = await listTopicIndexItems()
  topicItems.value = data.items || []
}

async function refreshGovernanceItems() {
  const data = await listMemoryWikiGovernanceRequests({
    status: governanceFilterStatus.value || undefined,
    queueSection: governanceFilterSection.value || undefined,
  })
  governanceItems.value = data.items || []

  if (selectedGovernanceId.value) {
    const exists = governanceItems.value.some((item) => item.requestId === selectedGovernanceId.value)
    if (!exists) {
      governanceDetail.value = null
      selectedGovernanceId.value = ''
    }
  }
}

async function refreshConfirmations() {
  const data = await listConfirmations({
    status: confirmationFilterStatus.value || undefined,
  })
  confirmations.value = data.confirmations || []
}

async function refreshAll() {
  loading.value = true
  errorMsg.value = ''
  try {
    await Promise.all([refreshPages(), refreshTopicItems(), refreshGovernanceItems(), refreshConfirmations()])
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '加载长期记忆工作台')
  } finally {
    loading.value = false
  }
}

async function selectPage(pageId) {
  loading.value = true
  errorMsg.value = ''
  try {
    selectedPageId.value = pageId
    const [data, versionData] = await Promise.all([getMemoryWikiPage(pageId), listMemoryWikiPageVersions(pageId)])
    const page = data.page
    pageVersions.value = versionData.items || []
    selectedVersionId.value = ''
    versionDiff.value = null
    pageSourceTrace.value = null
    pageForm.value = {
      pageId: page.pageId,
      pageType: page.pageType ?? 'topic',
      title: page.title ?? '',
      userName: page.userName ?? '',
      preferredName: page.preferredName ?? '',
      cornieRelationship: page.cornieRelationship ?? '',
      identitySummary: page.identitySummary ?? '',
      lifeStageSummary: page.lifeStageSummary ?? '',
      currentFocus: page.currentFocus ?? '',
      stressors: page.stressors ?? '',
      communicationPreference: page.communicationPreference ?? '',
      personName: page.personName ?? '',
      relationshipToUser: page.relationshipToUser ?? '',
      roleSummary: page.roleSummary ?? '',
      personalitySummary: page.personalitySummary ?? '',
      sharedExperienceSummary: page.sharedExperienceSummary ?? '',
      emotionalWeight: page.emotionalWeight ?? '',
      timelineSummary: page.timelineSummary ?? '',
      firstKnownPeriod: page.firstKnownPeriod ?? '',
      preferenceType: page.preferenceType ?? '',
      stance: page.stance ?? '',
      stabilityLevel: page.stabilityLevel ?? 'medium',
      traitType: page.traitType ?? '',
      confidenceLevel: page.confidenceLevel ?? 'low',
      traitSummary: page.traitSummary ?? '',
      evidenceCount: page.evidenceCount ?? 0,
      ownerConfirmed: page.ownerConfirmed === true,
      lastConfirmedAt: page.lastConfirmedAt ?? '',
      triggerKeywordsText: Array.isArray(page.triggerKeywords) ? page.triggerKeywords.join(', ') : '',
      summary: page.summary ?? '',
      body: page.body ?? '',
      aliasesText: Array.isArray(page.aliases) ? page.aliases.join(', ') : '',
      status: page.status ?? 'active',
      importance: page.importance ?? 'medium',
    }
    pageTopicKeyword.value = page.title ?? ''
    pageTopicAliasesText.value = Array.isArray(page.aliases) ? page.aliases.join(', ') : ''
    pageTopicNote.value = page.summary ?? ''
    const traceData = await getMemoryWikiPageSourceTrace(pageId)
    pageSourceTrace.value = traceData.trace || null
    relatedPageSelection.value = Array.isArray(traceData.trace?.page?.relatedPageIds)
      ? [...traceData.trace.page.relatedPageIds]
      : []
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '读取页面详情')
  } finally {
    loading.value = false
  }
}

async function selectTopic(normalizedKey) {
  loading.value = true
  errorMsg.value = ''
  try {
    selectedTopicKey.value = normalizedKey
    const data = await getTopicIndexItem(normalizedKey)
    const traceData = await getTopicIndexSourceTrace(normalizedKey)
    topicDetail.value = {
      ...data.item,
      aliasesText: Array.isArray(data.item?.aliases) ? data.item.aliases.join(', ') : '',
    }
    topicSourceTrace.value = traceData.trace || null
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '读取主题索引')
  } finally {
    loading.value = false
  }
}

async function selectGovernance(requestId) {
  loading.value = true
  errorMsg.value = ''
  try {
    selectedGovernanceId.value = requestId
    const data = await getMemoryWikiGovernanceRequest(requestId)
    governanceDetail.value = data.item
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '读取治理请求')
  } finally {
    loading.value = false
  }
}

function resetPageForm() {
  selectedPageId.value = ''
  pageVersions.value = []
  selectedVersionId.value = ''
  versionDiff.value = null
  pageForm.value = createEmptyPageForm()
  pageTopicKeyword.value = ''
  pageTopicAliasesText.value = ''
  pageTopicNote.value = ''
  relatedPageSelection.value = []
  pageSourceTrace.value = null
}

async function selectVersion(versionId) {
  if (!pageForm.value.pageId || !versionId) return
  loading.value = true
  errorMsg.value = ''
  try {
    selectedVersionId.value = versionId
    // 458：对比"所选历史版本 vs 当前页"，修复此前版本自比（恒为无变更）。
    const data = await getMemoryWikiPageVersionDiff(pageForm.value.pageId, {
      fromVersionId: versionId,
      toVersionId: 'current',
    })
    versionDiff.value = data.diff
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '读取版本差异')
  } finally {
    loading.value = false
  }
}

async function savePage() {
  saving.value = true
  errorMsg.value = ''
  try {
    const title = normalizeWorkspaceText(pageForm.value.title)
    if (!title) {
      throw new Error('请先填写页面标题。')
    }

    const duplicatePage = findDuplicatePageSummary({
      pageId: pageForm.value.pageId,
      pageType: pageForm.value.pageType,
      title,
    })
    if (duplicatePage) {
      throw new Error(`页面标题重复：已存在“${duplicatePage.title || duplicatePage.pageId}”，请换一个标题。`)
    }

    const payload = {
      pageType: pageForm.value.pageType,
      title,
      userName: pageForm.value.userName,
      preferredName: pageForm.value.preferredName,
      cornieRelationship: pageForm.value.cornieRelationship,
      identitySummary: pageForm.value.identitySummary,
      lifeStageSummary: pageForm.value.lifeStageSummary,
      currentFocus: pageForm.value.currentFocus,
      stressors: pageForm.value.stressors,
      communicationPreference: pageForm.value.communicationPreference,
      personName: pageForm.value.personName,
      relationshipToUser: pageForm.value.relationshipToUser,
      roleSummary: pageForm.value.roleSummary,
      personalitySummary: pageForm.value.personalitySummary,
      sharedExperienceSummary: pageForm.value.sharedExperienceSummary,
      emotionalWeight: pageForm.value.emotionalWeight,
      timelineSummary: pageForm.value.timelineSummary,
      firstKnownPeriod: pageForm.value.firstKnownPeriod,
      preferenceType: pageForm.value.preferenceType,
      stance: pageForm.value.stance,
      stabilityLevel: pageForm.value.stabilityLevel,
      traitType: pageForm.value.traitType,
      confidenceLevel: pageForm.value.confidenceLevel,
      traitSummary: pageForm.value.traitSummary,
      evidenceCount: Number(pageForm.value.evidenceCount) || 0,
      ownerConfirmed: pageForm.value.ownerConfirmed === true,
      lastConfirmedAt: pageForm.value.lastConfirmedAt,
      triggerKeywords: pageForm.value.triggerKeywordsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      summary: pageForm.value.summary,
      body: pageForm.value.body,
    }

    let finalPageId = pageForm.value.pageId
    if (pageForm.value.pageId) {
      await updateMemoryWikiPage(pageForm.value.pageId, payload)
    } else {
      const created = await createMemoryWikiPage(payload)
      finalPageId = created.page.pageId
      selectedPageId.value = finalPageId
    }

    const aliases = pageForm.value.aliasesText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    if (finalPageId) {
      await updateMemoryWikiAliases(finalPageId, aliases)
      await setMemoryWikiStatus(finalPageId, pageForm.value.status)
      await setMemoryWikiImportance(finalPageId, pageForm.value.importance)
      await selectPage(finalPageId)
    }

    await refreshPages()
    await refreshTopicItems()
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, pageForm.value.pageId ? '保存页面' : '创建页面')
  } finally {
    saving.value = false
  }
}

async function archivePage() {
  if (!pageForm.value.pageId) return
  saving.value = true
  errorMsg.value = ''
  try {
    await archiveMemoryWikiPage(pageForm.value.pageId)
    await refreshPages()
    await selectPage(pageForm.value.pageId)
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '归档页面')
  } finally {
    saving.value = false
  }
}

async function restorePage() {
  if (!pageForm.value.pageId) return
  saving.value = true
  errorMsg.value = ''
  try {
    await restoreMemoryWikiPage(pageForm.value.pageId)
    await refreshPages()
    await selectPage(pageForm.value.pageId)
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '恢复页面')
  } finally {
    saving.value = false
  }
}

async function rollbackPage() {
  if (!pageForm.value.pageId || !selectedVersionId.value) return
  saving.value = true
  errorMsg.value = ''
  try {
    await rollbackMemoryWikiPage(pageForm.value.pageId, selectedVersionId.value)
    await refreshPages()
    await selectPage(pageForm.value.pageId)
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '回滚页面')
  } finally {
    saving.value = false
  }
}

async function saveTopicAliases() {
  if (!topicDetail.value?.normalizedKey) return
  const aliases = String(topicDetail.value.aliasesText ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  saving.value = true
  errorMsg.value = ''
  try {
    await updateTopicIndexAliases(topicDetail.value.normalizedKey, aliases)
    await refreshTopicItems()
    await selectTopic(topicDetail.value.normalizedKey)
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '保存主题别名')
  } finally {
    saving.value = false
  }
}

async function saveRelatedPages() {
  if (!pageForm.value.pageId) return

  saving.value = true
  errorMsg.value = ''
  try {
    const relatedPageIds = Array.from(
      new Set(relatedPageSelection.value.map((item) => String(item).trim()).filter(Boolean))
    )
    await linkMemoryWikiRelatedPages(pageForm.value.pageId, relatedPageIds)
    await refreshPages()
    await selectPage(pageForm.value.pageId)
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '保存页面关联')
  } finally {
    saving.value = false
  }
}

async function linkSelectedPageToTopic() {
  if (!pageForm.value.pageId || !pageTopicKeyword.value.trim()) return

  saving.value = true
  errorMsg.value = ''
  try {
    const aliases = pageTopicAliasesText.value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    await linkMemoryWikiPageToTopic(pageForm.value.pageId, {
      keyword: pageTopicKeyword.value.trim(),
      aliases,
      note: pageTopicNote.value.trim(),
      importance: pageForm.value.importance,
    })

    await refreshPages()
    await refreshTopicItems()
    await selectPage(pageForm.value.pageId)
    await selectTopic(pageTopicKeyword.value.trim().toLowerCase())
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '绑定主题索引')
  } finally {
    saving.value = false
  }
}

async function runInspectionScan() {
  saving.value = true
  errorMsg.value = ''
  try {
    await enqueueMemoryWikiInspectionScan()
    await refreshGovernanceItems()
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '发起巡检')
  } finally {
    saving.value = false
  }
}

async function changeGovernanceStatus(requestId, status) {
  saving.value = true
  errorMsg.value = ''
  try {
    await updateMemoryWikiGovernanceRequestStatus(requestId, status)
    await refreshGovernanceItems()
    if (selectedGovernanceId.value === requestId) {
      await selectGovernance(requestId)
    }
  } catch (error) {
    errorMsg.value = formatWorkspaceError(error, '更新治理请求状态')
  } finally {
    saving.value = false
  }
}

async function handleConfirmationAction(action, confirmation) {
  const nextStatus = action === 'approve' ? 'processing' : 'processing'
  confirmStatusMap.value = {
    ...confirmStatusMap.value,
    [confirmation.id]: nextStatus,
  }
  confirmErrorMap.value = {
    ...confirmErrorMap.value,
    [confirmation.id]: '',
  }

  try {
    const result = await submitConfirmationDecision(confirmation.id, action)
    const status =
      result?.confirmation?.status ||
      result?.followupConfirmation?.status ||
      (action === 'approve' ? 'approved' : 'rejected')

    confirmStatusMap.value = {
      ...confirmStatusMap.value,
      [confirmation.id]: status,
    }
    await refreshConfirmations()
  } catch (error) {
    confirmStatusMap.value = {
      ...confirmStatusMap.value,
      [confirmation.id]: 'failed',
    }
    confirmErrorMap.value = {
      ...confirmErrorMap.value,
      [confirmation.id]: error?.message || String(error),
    }
  }
}

function formatEvidence(item) {
  try {
    return JSON.stringify(item, null, 2)
  } catch {
    return String(item)
  }
}

function buildEvidenceSummary(item, index) {
  if (!item || typeof item !== 'object') {
    return `证据 ${index + 1}`
  }

  if (item.issueType) {
    return `问题类型：${item.issueType}`
  }

  if (item.duplicateScore !== undefined) {
    return `重复度：${item.duplicateScore}`
  }

  if (item.suggestion?.action) {
    return `建议动作：${item.suggestion.action}`
  }

  const firstKey = Object.keys(item)[0]
  if (!firstKey) return `证据 ${index + 1}`
  return `${firstKey}：${String(item[firstKey])}`
}

onMounted(refreshAll)
</script>

<template>
  <section class="workspaceShell">
    <MemoryWikiWorkspaceHead
      :loading="loading"
      :saving="saving"
      @run-inspection="runInspectionScan"
      @refresh="refreshAll"
    />

    <div v-if="errorMsg" class="workspaceError">{{ errorMsg }}</div>

    <div class="workspaceGrid">
      <MemoryWikiPageListPanel
        :pages="pages"
        :selected-page-id="selectedPageId"
        :filter-type="pageFilterType"
        :filter-status="pageFilterStatus"
        @select-page="selectPage"
        @update:filter-type="pageFilterType = $event"
        @update:filter-status="pageFilterStatus = $event"
        @change="refreshPages"
      />

      <MemoryWikiPageEditorPanel
        :selected-page="selectedPage"
        v-model:page-form="pageForm"
        :saving="saving"
        :page-source-trace="pageSourceTrace"
        :selected-version-id="selectedVersionId"
        :identity-page-options="identityPageOptions"
        :identity-relationship-rules="identityRelationshipRules"
        :identity-relationship-candidates="identityRelationshipCandidates"
        :identity-relationship-warnings="identityRelationshipWarnings"
        :related-page-issues="relatedPageIssues"
        :related-page-selection="relatedPageSelection"
        :page-topic-keyword="pageTopicKeyword"
        :page-topic-aliases-text="pageTopicAliasesText"
        :page-topic-note="pageTopicNote"
        @reset="resetPageForm"
        @save="savePage"
        @archive="archivePage"
        @restore="restorePage"
        @rollback="rollbackPage"
        @save-related-pages="saveRelatedPages"
        @link-topic="linkSelectedPageToTopic"
        @update:page-topic-keyword="pageTopicKeyword = $event"
        @update:page-topic-aliases-text="pageTopicAliasesText = $event"
        @update:page-topic-note="pageTopicNote = $event"
        @update:related-page-selection="relatedPageSelection = $event"
      />

      <MemoryWikiVersionPanel
        :page-id="pageForm.pageId"
        :page-versions="pageVersions"
        :selected-version-id="selectedVersionId"
        :selected-version="selectedVersion"
        :version-diff="versionDiff"
        @select-version="selectVersion"
      />

      <MemoryWikiTopicIndexPanel
        :topic-items="topicItems"
        :selected-topic-key="selectedTopicKey"
        v-model:topic-detail="topicDetail"
        :topic-source-trace="topicSourceTrace"
        :saving="saving"
        @select-topic="selectTopic"
        @save-topic-aliases="saveTopicAliases"
      />

      <MemoryWikiGovernanceQueuePanel
        :governance-items="governanceItems"
        :selected-governance-id="selectedGovernanceId"
        :filter-status="governanceFilterStatus"
        :filter-section="governanceFilterSection"
        :sections="governanceSections"
        :pending-count="pendingGovernanceCount"
        :filter-summary="governanceFilterSummary"
        @select-governance="selectGovernance"
        @update:filter-status="governanceFilterStatus = $event"
        @update:filter-section="governanceFilterSection = $event"
        @change="refreshGovernanceItems"
      />

      <MemoryWikiGovernanceDetailPanel
        :detail="governanceDetail"
        :evidence-items="governanceEvidenceItems"
        :suggested-actions="governanceSuggestedActions"
        :filter-summary="governanceFilterSummary"
        :saving="saving"
        @approve="changeGovernanceStatus(governanceDetail?.requestId, 'approved')"
        @defer="changeGovernanceStatus(governanceDetail?.requestId, 'deferred')"
        @reject="changeGovernanceStatus(governanceDetail?.requestId, 'rejected')"
      />

      <MemoryWikiConfirmationPanel
        :confirmations="confirmations"
        :filter-status="confirmationFilterStatus"
        :pending-count="pendingConfirmationCount"
        :status-map="confirmStatusMap"
        :error-map="confirmErrorMap"
        @confirm="handleConfirmationAction('approve', $event)"
        @reject="handleConfirmationAction('reject', $event)"
        @update:filter-status="confirmationFilterStatus = $event"
        @change="refreshConfirmations"
      />
    </div>
  </section>
</template>

<style scoped>
.workspaceShell {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.workspaceHead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.workspaceTitle {
  font-size: 22px;
  font-weight: 800;
}
.workspaceHint {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
  max-width: 720px;
}
.headActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.workspaceError {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.08);
  color: rgba(254, 226, 226, 0.95);
}
.workspaceGrid {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}
.workspaceCard {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.span2 {
  grid-column: 1 / -1;
}
.cardHead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.cardTitle {
  font-weight: 800;
  font-size: 16px;
}
.cardHint {
  color: var(--muted);
  font-size: 12px;
  max-width: 360px;
  text-align: right;
  line-height: 1.5;
}
.cardSubhint {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}
.cardFilters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filterSummary {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(125, 211, 252, 0.2);
  background: rgba(125, 211, 252, 0.06);
  color: rgba(224, 242, 254, 0.88);
  font-size: 13px;
}
.emptyState {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px dashed var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  line-height: 1.6;
}
.entryList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}
.entryRow {
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
}
.entryRow.active {
  background: rgba(125, 211, 252, 0.12);
  border-color: rgba(125, 211, 252, 0.35);
}
.entryMain {
  font-weight: 700;
}
.entryMeta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}
.formGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.formGrid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.formGrid .span2 {
  grid-column: 1 / -1;
}
.actionRow {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.queueSummary {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  font-size: 13px;
}
.topicGrid {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}
.versionGrid {
  display: grid;
  grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}
.versionList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}
.versionDetail {
  min-width: 0;
}
.topicList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}
.topicDetail,
.governanceDetail,
.emptyDetail {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
}
.detailTitle {
  font-weight: 800;
  font-size: 18px;
}
.detailBadgeRow {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.detailBadge {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
}
.detailMeta {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.detailMetaGrid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.detailMetaCard {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
}
.detailMetaLabel {
  font-size: 11px;
  color: var(--muted);
}
.detailMetaValue {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  overflow-wrap: anywhere;
}
.detailSection {
  margin-top: 14px;
}
.detailText {
  margin-top: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.suggestionList {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.suggestionItem {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.88);
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.warningItem {
  border-color: rgba(248, 113, 113, 0.24);
  background: rgba(248, 113, 113, 0.08);
}
.topicAliases {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  font-size: 13px;
}
.relationshipGrid select {
  min-height: 160px;
}
.evidenceBlock {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.evidenceTitle {
  font-size: 13px;
  font-weight: 700;
}
.evidenceCards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.evidenceCard {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px;
}
.evidenceSummary {
  font-size: 12px;
  font-weight: 700;
  color: rgba(248, 250, 252, 0.92);
  margin-bottom: 8px;
}
.evidenceItem {
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.55);
  color: rgba(226, 232, 240, 0.92);
  font-size: 12px;
  white-space: pre-wrap;
  overflow: auto;
}
.emptyInline {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.02);
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.confirmGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}
.emptyDetail {
  color: var(--muted);
  display: grid;
  place-items: center;
  min-height: 180px;
  text-align: center;
  line-height: 1.6;
}
.compactEmpty {
  min-height: 120px;
}
@media (max-width: 1120px) {
  .workspaceGrid,
  .topicGrid,
  .versionGrid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 720px) {
  .workspaceHead,
  .cardHead {
    flex-direction: column;
  }
  .cardHint {
    text-align: left;
  }
  .formGrid {
    grid-template-columns: 1fr;
  }
  .detailMetaGrid {
    grid-template-columns: 1fr;
  }
}
</style>
