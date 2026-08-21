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
  updateTopicIndexAliases
} from '../api'
import ConfirmCard from './ConfirmCard.vue'

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
    importance: 'medium'
  }
}

const selectedPage = computed(() => pages.value.find((item) => item.pageId === selectedPageId.value) || null)
const selectedVersion = computed(() => pageVersions.value.find((item) => item.versionId === selectedVersionId.value) || null)
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
    body: formatEvidence(item)
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
      status: item.status
    }))
)
const selectedRelatedPageIds = computed(() => Array.isArray(pageSourceTrace.value?.page?.relatedPageIds) ? pageSourceTrace.value.page.relatedPageIds : [])
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
      '建议关联 identity_trait：性格倾向、情绪模式、压力反应。'
    ]
  }
  if (pageType === 'identity_person') {
    return [
      '建议至少关联一个 identity_profile：说明这个人物属于谁的人际网络。',
      '必要时关联 identity_trait：记录这个人物和主人的互动特征或关系状态。'
    ]
  }
  if (pageType === 'identity_preference') {
    return [
      '建议至少关联一个 identity_profile：偏好应归属于具体的人。',
      '如偏好与某人物强相关，也可额外关联 identity_person。'
    ]
  }
  if (pageType === 'identity_trait') {
    return [
      '建议至少关联一个 identity_profile： trait 应说明是在描写谁。',
      '如 trait 与特定人物关系有关，也可关联 identity_person。'
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
      linked: selectedIds.has(item.pageId)
    }))
})
const identityRelationshipWarnings = computed(() => {
  const pageType = pageForm.value.pageType
  if (!String(pageType || '').startsWith('identity_') || !pageForm.value.pageId) return []

  const linkedTypes = new Set(
    selectedRelatedPageIds.value
      .map((pageId) => relatedPageMap.value.get(pageId)?.pageType)
      .filter(Boolean)
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

  return pages.value.find((item) => {
    if (String(item.pageId || '') === String(pageId || '')) return false
    if (normalizeWorkspaceText(item.pageType) !== normalizedPageType) return false
    const itemSlug = buildWorkspaceSlug(item.slug || item.title || '')
    return itemSlug === targetSlug
  }) || null
}

async function refreshPages() {
  const data = await listMemoryWikiPages({
    pageType: pageFilterType.value || undefined,
    status: pageFilterStatus.value || undefined
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
    queueSection: governanceFilterSection.value || undefined
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
    status: confirmationFilterStatus.value || undefined
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
      importance: page.importance ?? 'medium'
    }
    pageTopicKeyword.value = page.title ?? ''
    pageTopicAliasesText.value = Array.isArray(page.aliases) ? page.aliases.join(', ') : ''
    pageTopicNote.value = page.summary ?? ''
    const traceData = await getMemoryWikiPageSourceTrace(pageId)
    pageSourceTrace.value = traceData.trace || null
    relatedPageSelection.value = Array.isArray(traceData.trace?.page?.relatedPageIds) ? [...traceData.trace.page.relatedPageIds] : []
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
      aliasesText: Array.isArray(data.item?.aliases) ? data.item.aliases.join(', ') : ''
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
    const data = await getMemoryWikiPageVersionDiff(pageForm.value.pageId, {
      fromVersionId: versionId,
      toVersionId: versionId
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
      title
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
      body: pageForm.value.body
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
    const relatedPageIds = Array.from(new Set(relatedPageSelection.value.map((item) => String(item).trim()).filter(Boolean)))
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
      importance: pageForm.value.importance
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

function resolveConfirmationState(confirmation) {
  return confirmStatusMap.value[confirmation.id] || confirmation.status || 'pending'
}

async function handleConfirmationAction(action, confirmation) {
  const nextStatus = action === 'approve' ? 'processing' : 'processing'
  confirmStatusMap.value = {
    ...confirmStatusMap.value,
    [confirmation.id]: nextStatus
  }
  confirmErrorMap.value = {
    ...confirmErrorMap.value,
    [confirmation.id]: ''
  }

  try {
    const result = await submitConfirmationDecision(confirmation.id, action)
    const status =
      result?.confirmation?.status ||
      result?.followupConfirmation?.status ||
      (action === 'approve' ? 'approved' : 'rejected')

    confirmStatusMap.value = {
      ...confirmStatusMap.value,
      [confirmation.id]: status
    }
    await refreshConfirmations()
  } catch (error) {
    confirmStatusMap.value = {
      ...confirmStatusMap.value,
      [confirmation.id]: 'failed'
    }
    confirmErrorMap.value = {
      ...confirmErrorMap.value,
      [confirmation.id]: error?.message || String(error)
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
    <header class="workspaceHead">
      <div>
        <div class="workspaceTitle">Memory Wiki 工作台</div>
        <div class="workspaceHint">
          主人可以直接看长期记忆页面、主题索引、治理待审核池，还有那些需要你亲自点头的高风险动作。
        </div>
      </div>
      <div class="headActions">
        <button :disabled="saving" @click="runInspectionScan">{{ saving ? '处理中…' : '运行巡检入池' }}</button>
        <button :disabled="loading" @click="refreshAll">{{ loading ? '刷新中…' : '刷新全部' }}</button>
      </div>
    </header>

    <div v-if="errorMsg" class="workspaceError">{{ errorMsg }}</div>

    <div class="workspaceGrid">
      <section class="workspaceCard">
        <div class="cardHead">
          <div>
            <div class="cardTitle">记忆页面</div>
            <div class="cardSubhint">先从页面总览看清楚：哪些记忆正在使用，哪些只是暂存，哪些已经归档。</div>
          </div>
          <div class="cardFilters">
            <select v-model="pageFilterType" @change="refreshPages">
              <option value="">全部类型</option>
              <option value="topic">topic</option>
              <option value="person">person</option>
              <option value="event">event</option>
              <option value="preference">preference</option>
              <option value="identity_profile">identity_profile</option>
              <option value="identity_person">identity_person</option>
              <option value="identity_preference">identity_preference</option>
              <option value="identity_trait">identity_trait</option>
            </select>
            <select v-model="pageFilterStatus" @change="refreshPages">
              <option value="">全部状态</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="archived">archived</option>
            </select>
          </div>
        </div>

        <div v-if="pages.length === 0" class="emptyState">
          这里暂时还没有记忆页面。等铃湾和主人慢慢把重要的人、事、偏好记下来，这里就会热闹起来。
        </div>

        <div v-else class="entryList">
          <button
            v-for="page in pages"
            :key="page.pageId"
            class="entryRow"
            :class="{ active: page.pageId === selectedPageId }"
            @click="selectPage(page.pageId)"
          >
            <div>
              <div class="entryMain">{{ page.title }}</div>
              <div class="entryMeta">{{ page.pageType }} · {{ page.status }} · {{ page.importance }}</div>
            </div>
          </button>
        </div>
      </section>

      <section class="workspaceCard">
        <div class="cardHead">
          <div>
            <div class="cardTitle">{{ selectedPage ? '编辑页面' : '新建页面' }}</div>
            <div class="cardSubhint">
              {{ selectedPage ? '正在整理这页长期记忆的标题、摘要、正文和重要性。' : '先写标题和摘要，再慢慢把这一页记忆补完整。' }}
            </div>
          </div>
          <button v-if="selectedPage" @click="resetPageForm">新建页面</button>
        </div>

        <div class="formGrid">
          <label>
            <span>页面类型</span>
            <select v-model="pageForm.pageType">
              <option value="topic">topic</option>
              <option value="person">person</option>
              <option value="event">event</option>
              <option value="preference">preference</option>
              <option value="identity_profile">identity_profile</option>
              <option value="identity_person">identity_person</option>
              <option value="identity_preference">identity_preference</option>
              <option value="identity_trait">identity_trait</option>
            </select>
          </label>
          <label>
            <span>状态</span>
            <select v-model="pageForm.status">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label class="span2">
            <span>标题</span>
            <input v-model="pageForm.title" placeholder="输入页面标题" />
          </label>
          <template v-if="pageForm.pageType === 'identity_profile'">
            <label>
              <span>用户名字</span>
              <input v-model="pageForm.userName" placeholder="例如：叶健钦" />
            </label>
            <label>
              <span>偏好称呼</span>
              <input v-model="pageForm.preferredName" placeholder="例如：爸爸" />
            </label>
            <label class="span2">
              <span>与 Cornie 的关系</span>
              <input v-model="pageForm.cornieRelationship" placeholder="例如：用户是 Cornie 的创造者，也是 Cornie 的爸爸" />
            </label>
            <label class="span2">
              <span>身份摘要</span>
              <textarea v-model="pageForm.identitySummary" rows="3" placeholder="例如：当前处于项目、考试、实习与求职压力交织阶段。" />
            </label>
            <label class="span2">
              <span>阶段概况</span>
              <textarea v-model="pageForm.lifeStageSummary" rows="3" placeholder="例如：学业推进中，同时承担多个个人项目与求职任务。" />
            </label>
            <label>
              <span>当前关注</span>
              <input v-model="pageForm.currentFocus" placeholder="例如：项目推进、考试、实习" />
            </label>
            <label>
              <span>主要压力</span>
              <input v-model="pageForm.stressors" placeholder="例如：时间压力、项目并行、求职焦虑" />
            </label>
            <label class="span2">
              <span>沟通偏好</span>
              <textarea v-model="pageForm.communicationPreference" rows="2" placeholder="例如：希望被温柔、克制、记得上下文地陪伴。" />
            </label>
          </template>
          <template v-if="pageForm.pageType === 'identity_preference'">
            <label>
              <span>偏好类型</span>
              <select v-model="pageForm.preferenceType">
                <option value="">未分类</option>
                <option value="饮食">饮食</option>
                <option value="交流">交流</option>
                <option value="风格">风格</option>
                <option value="作息">作息</option>
                <option value="情感表达">情感表达</option>
              </select>
            </label>
            <label>
              <span>立场</span>
              <select v-model="pageForm.stance">
                <option value="">未标注</option>
                <option value="喜欢">喜欢</option>
                <option value="不喜欢">不喜欢</option>
                <option value="中性偏好">中性偏好</option>
              </select>
            </label>
            <label>
              <span>稳定性</span>
              <select v-model="pageForm.stabilityLevel">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
            <label>
              <span>证据计数</span>
              <input v-model="pageForm.evidenceCount" type="number" min="0" />
            </label>
            <label class="span2">
              <span>最近确认时间</span>
              <input v-model="pageForm.lastConfirmedAt" placeholder="例如：2026-06-29" />
            </label>
            <label class="span2">
              <span>触发关键词（逗号分隔）</span>
              <input v-model="pageForm.triggerKeywordsText" placeholder="例如：奶茶, 咖啡, 甜度" />
            </label>
          </template>
          <template v-if="pageForm.pageType === 'identity_person'">
            <label>
              <span>人物名字</span>
              <input v-model="pageForm.personName" placeholder="例如：钟奕菲" />
            </label>
            <label>
              <span>与用户关系</span>
              <input v-model="pageForm.relationshipToUser" placeholder="例如：初恋、朋友、家人" />
            </label>
            <label class="span2">
              <span>身份摘要</span>
              <textarea v-model="pageForm.roleSummary" rows="2" placeholder="例如：用户人生中具有高情感权重的重要人物。" />
            </label>
            <label class="span2">
              <span>性格摘要</span>
              <textarea v-model="pageForm.personalitySummary" rows="2" placeholder="例如：温柔、害羞、内向。" />
            </label>
            <label class="span2">
              <span>共同经历</span>
              <textarea v-model="pageForm.sharedExperienceSummary" rows="3" placeholder="例如：2021年冬天相恋，2022年春天疏远，2022年夏天决裂。" />
            </label>
            <label>
              <span>情感权重</span>
              <input v-model="pageForm.emotionalWeight" placeholder="例如：high / 很高" />
            </label>
            <label>
              <span>首次已知阶段</span>
              <input v-model="pageForm.firstKnownPeriod" placeholder="例如：2021年冬天" />
            </label>
            <label class="span2">
              <span>时间线摘要</span>
              <textarea v-model="pageForm.timelineSummary" rows="2" placeholder="例如：相恋-疏远-决裂。" />
            </label>
          </template>
          <template v-if="pageForm.pageType === 'identity_trait'">
            <label>
              <span>侧写类型</span>
              <select v-model="pageForm.traitType">
                <option value="">未分类</option>
                <option value="性格倾向">性格倾向</option>
                <option value="情绪模式">情绪模式</option>
                <option value="沟通风格">沟通风格</option>
                <option value="压力反应">压力反应</option>
                <option value="关系状态">关系状态</option>
              </select>
            </label>
            <label>
              <span>置信度</span>
              <select v-model="pageForm.confidenceLevel">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
            <label>
              <span>稳定性</span>
              <select v-model="pageForm.stabilityLevel">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
            <label>
              <span>主人确认</span>
              <select v-model="pageForm.ownerConfirmed">
                <option :value="false">未确认</option>
                <option :value="true">已确认</option>
              </select>
            </label>
            <label class="span2">
              <span>侧写摘要</span>
              <textarea v-model="pageForm.traitSummary" rows="3" placeholder="例如：高压时容易疲惫，但会努力把情绪转成行动。" />
            </label>
            <label>
              <span>证据计数</span>
              <input v-model="pageForm.evidenceCount" type="number" min="0" />
            </label>
            <label>
              <span>最近确认时间</span>
              <input v-model="pageForm.lastConfirmedAt" placeholder="例如：2026-06-29" />
            </label>
            <label class="span2">
              <span>触发关键词（逗号分隔）</span>
              <input v-model="pageForm.triggerKeywordsText" placeholder="例如：压力, 焦虑, 安慰, 累" />
            </label>
          </template>
          <label class="span2">
            <span>摘要</span>
            <textarea v-model="pageForm.summary" rows="4" placeholder="写一段简短摘要" />
          </label>
          <label class="span2">
            <span>正文</span>
            <textarea v-model="pageForm.body" rows="10" placeholder="这里是页面正文 Markdown" />
          </label>
          <label class="span2">
            <span>别名（逗号分隔）</span>
            <input v-model="pageForm.aliasesText" placeholder="例如：龙虾, 澳洲龙虾" />
          </label>
          <label>
            <span>重要性</span>
            <select v-model="pageForm.importance">
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
          </label>
          <label>
            <span>页面 ID</span>
            <input :value="pageForm.pageId || '保存后生成'" disabled />
          </label>
        </div>

        <div class="actionRow">
          <button :disabled="saving" @click="savePage">{{ saving ? '保存中…' : '保存页面' }}</button>
          <button v-if="pageForm.pageId && pageForm.status !== 'archived'" :disabled="saving" @click="archivePage">归档页面</button>
          <button v-if="pageForm.pageId && pageForm.status === 'archived'" :disabled="saving" @click="restorePage">恢复页面</button>
          <button v-if="pageForm.pageId" :disabled="saving || !selectedVersionId" @click="rollbackPage">
            {{ selectedVersionId ? '回滚到当前选中版本' : '先选择版本再回滚' }}
          </button>
        </div>

        <div v-if="pageSourceTrace && pageForm.pageId" class="detailSection">
          <div class="evidenceTitle">来源追溯</div>
          <div class="detailMeta">关联页面：{{ (pageSourceTrace.relatedPages || []).map((item) => item.title).join(', ') || '无' }}</div>
          <div class="detailMeta">聊天来源：{{ (pageSourceTrace.chatSources || []).map((item) => item.date).join(', ') || '无' }}</div>
          <div class="detailMeta">观察来源：{{ (pageSourceTrace.observationSources || []).map((item) => item.title).join(', ') || '无' }}</div>
          <div v-if="(pageSourceTrace.chatSources || []).length > 0" class="evidenceBlock">
            <div class="evidenceTitle">聊天片段</div>
            <div class="evidenceCards">
              <div v-for="item in pageSourceTrace.chatSources" :key="`${item.date}-${item.messageId}`" class="evidenceCard">
                <div class="evidenceSummary">{{ item.title }}</div>
                <div class="detailMeta">{{ item.preview || '原消息已不可读' }}</div>
              </div>
            </div>
          </div>
          <div v-if="(pageSourceTrace.observationSources || []).length > 0" class="evidenceBlock">
            <div class="evidenceTitle">观察记录</div>
            <div class="evidenceCards">
              <div v-for="item in pageSourceTrace.observationSources" :key="item.observationId" class="evidenceCard">
                <div class="evidenceSummary">{{ item.title }}</div>
                <div class="detailMeta">{{ item.preview || '原观察记录已不可读' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="pageForm.pageId && pageForm.pageType.startsWith('identity_')" class="detailSection">
          <div class="evidenceTitle">Identity 关系链路</div>
          <div class="cardSubhint">
            Identity 页不应该只是孤零零的一页。把“这个人是谁、属于谁、和哪些偏好或特征有关”串起来，铃湾后面召回会稳定很多。
          </div>

          <div v-if="identityRelationshipRules.length > 0" class="suggestionList">
            <div v-for="item in identityRelationshipRules" :key="item" class="suggestionItem">{{ item }}</div>
          </div>

          <div class="formGrid relationshipGrid">
            <label class="span2">
              <span>关联 Identity 页面</span>
              <select v-model="relatedPageSelection" multiple size="6">
                <option v-for="item in identityPageOptions" :key="item.pageId" :value="item.pageId">
                  {{ item.title }} · {{ item.pageType }} · {{ item.status }}
                </option>
              </select>
            </label>
          </div>

          <div class="actionRow">
            <button :disabled="saving" @click="saveRelatedPages">{{ saving ? '保存中…' : '保存关系链路' }}</button>
          </div>

          <div v-if="identityRelationshipCandidates.length > 0" class="detailSection">
            <div class="evidenceTitle">推荐补链</div>
            <div class="suggestionList">
              <div
                v-for="item in identityRelationshipCandidates"
                :key="item.pageId"
                class="suggestionItem"
              >
                {{ item.title }} · {{ item.pageType }} · {{ item.linked ? '已关联' : '可补充关联' }}
              </div>
            </div>
          </div>

          <div v-if="identityRelationshipWarnings.length > 0" class="detailSection">
            <div class="evidenceTitle">治理提醒</div>
            <div class="suggestionList">
              <div v-for="item in identityRelationshipWarnings" :key="item" class="suggestionItem warningItem">{{ item }}</div>
            </div>
          </div>

          <div v-if="relatedPageIssues.length > 0" class="detailSection">
            <div class="evidenceTitle">关联异常</div>
            <div class="suggestionList">
              <div
                v-for="item in relatedPageIssues"
                :key="`${item.issueType}-${item.relatedPageId}`"
                class="suggestionItem warningItem"
              >
                {{ item.message || `${item.issueType} · ${item.relatedPageId}` }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="pageForm.pageId && pageForm.pageType === 'identity_person'" class="detailSection">
          <div class="evidenceTitle">人物页联动 Topic</div>
          <div class="cardSubhint">
            给重要人物页挂上一个主题索引键。以后主人提到这个名字、别名，或相关人物线索时，铃湾就更容易优先召回这页人物记忆。
          </div>
          <div class="formGrid topicLinkGrid">
            <label>
              <span>主题关键词</span>
              <input v-model="pageTopicKeyword" placeholder="例如：钟奕菲" />
            </label>
            <label>
              <span>沿用重要性</span>
              <input :value="pageForm.importance" disabled />
            </label>
            <label class="span2">
              <span>主题别名（逗号分隔）</span>
              <input v-model="pageTopicAliasesText" placeholder="例如：奕菲, 钟同学" />
            </label>
            <label class="span2">
              <span>索引备注</span>
              <textarea v-model="pageTopicNote" rows="3" placeholder="给这个人物主题留一句简短备注" />
            </label>
          </div>
          <div class="actionRow">
            <button :disabled="saving || !pageTopicKeyword.trim()" @click="linkSelectedPageToTopic">
              {{ saving ? '联动中…' : '联动到 Topic Index' }}
            </button>
          </div>
        </div>
      </section>

      <section class="workspaceCard span2">
        <div class="cardHead">
          <div>
            <div class="cardTitle">版本历史与回滚</div>
            <div class="cardSubhint">先看版本列表，再选一个版本。这样主人不需要手输版本 ID，也更不容易回滚错页。</div>
          </div>
          <div class="cardHint">每次重要修改前后留下的快照，都会在这里排开给你看。</div>
        </div>

        <div v-if="!pageForm.pageId" class="emptyDetail compactEmpty">
          先从左边选中一个记忆页面，我就把这页的版本历史整理给你看。
        </div>

        <div v-else class="versionGrid">
          <div v-if="pageVersions.length === 0" class="emptyDetail compactEmpty">
            这页目前还没有可用的历史版本记录。
          </div>

          <div v-else class="versionList">
            <button
              v-for="item in pageVersions"
              :key="item.versionId"
              class="entryRow"
              :class="{ active: item.versionId === selectedVersionId }"
              @click="selectVersion(item.versionId)"
            >
              <div>
                <div class="entryMain">{{ item.reason || 'snapshot' }}</div>
                <div class="entryMeta">{{ item.versionId }} · {{ item.createdAt || '未知时间' }}</div>
              </div>
            </button>
          </div>

          <div class="versionDetail">
            <div v-if="selectedVersion" class="governanceDetail">
              <div class="detailTitle">已选版本</div>
              <div class="detailMeta">版本 ID：{{ selectedVersion.versionId }}</div>
              <div class="detailMeta">快照原因：{{ selectedVersion.reason || 'snapshot' }}</div>
              <div class="detailMeta">创建时间：{{ selectedVersion.createdAt || '未知时间' }}</div>

              <div v-if="versionDiff" class="evidenceBlock">
                <div class="evidenceTitle">版本摘要</div>
                <div class="detailMeta">标题变更：{{ versionDiff.titleChanged ? '是' : '否' }}</div>
                <div class="detailMeta">摘要变更：{{ versionDiff.summaryChanged ? '是' : '否' }}</div>
                <div class="detailMeta">正文变更：{{ versionDiff.bodyChanged ? '是' : '否' }}</div>
                <div class="detailMeta">状态变更：{{ versionDiff.statusChanged ? '是' : '否' }}</div>
                <div class="detailMeta">重要性变更：{{ versionDiff.importanceChanged ? '是' : '否' }}</div>
                <pre class="evidenceItem">回滚后将把当前页面恢复到这个历史快照。</pre>
              </div>
            </div>
            <div v-else class="emptyDetail compactEmpty">
              点左边某个版本，我就把这个版本的关键信息展开给你看。
            </div>
          </div>
        </div>
      </section>

      <section class="workspaceCard span2">
        <div class="cardHead">
          <div>
            <div class="cardTitle">Topic Index</div>
            <div class="cardSubhint">主题索引更像一张导航图，帮主人快速找到某个关键词都在哪几天、哪几页里出现过。</div>
          </div>
          <div class="cardHint">这里能看到主题关键词、热度、日期，以及它们连到了哪些记忆页面。</div>
        </div>

        <div class="topicGrid">
          <div v-if="topicItems.length === 0" class="emptyDetail">
            现在还没有可用的主题索引。等记忆页面和聊天慢慢积累起来，这里就会帮你把关键词串起来。
          </div>

          <div v-else class="topicList">
            <button
              v-for="item in topicItems"
              :key="item.normalizedKey"
              class="entryRow"
              :class="{ active: item.normalizedKey === selectedTopicKey }"
              @click="selectTopic(item.normalizedKey)"
            >
              <div>
                <div class="entryMain">{{ item.keyword || item.normalizedKey }}</div>
                <div class="entryMeta">heat {{ item.heatScore ?? 0 }} · {{ item.pageIds?.length || 0 }} pages</div>
              </div>
            </button>
          </div>

          <div class="topicDetail" v-if="topicDetail">
            <div class="detailTitle">{{ topicDetail.keyword || topicDetail.normalizedKey }}</div>
            <div class="detailMeta">索引键：{{ topicDetail.normalizedKey }}</div>
            <div class="detailMeta">主题热度：{{ topicDetail.heatScore ?? 0 }}</div>
            <div class="detailMeta">相关日期：{{ (topicDetail.dates || []).join(', ') || '无' }}</div>
            <div class="detailMeta">关联页面：{{ (topicDetail.pageIds || topicDetail.memoryPageIds || []).join(', ') || '无' }}</div>
            <div class="detailMeta">聊天来源：{{ (topicSourceTrace?.chatSources || []).map((item) => item.date).join(', ') || '无' }}</div>
            <div class="detailMeta">观察来源：{{ (topicSourceTrace?.observationSources || []).map((item) => item.title).join(', ') || '无' }}</div>
            <label class="topicAliases">
              <span>别名（逗号分隔）</span>
              <input v-model="topicDetail.aliasesText" />
            </label>
            <button :disabled="saving" @click="saveTopicAliases">保存主题别名</button>
          </div>
          <div v-else class="emptyDetail">点一个主题，我就把它的索引详情展开给主人看。</div>
        </div>
      </section>

      <section class="workspaceCard">
        <div class="cardHead">
          <div>
            <div class="cardTitle">治理待审核区</div>
            <div class="cardSubhint">这里放的是治理建议，不会直接改数据，先给主人过目再决定怎么处理。</div>
          </div>
          <div class="cardFilters">
            <select v-model="governanceFilterStatus" @change="refreshGovernanceItems">
              <option value="">全部状态</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="deferred">deferred</option>
            </select>
            <select v-model="governanceFilterSection" @change="refreshGovernanceItems">
              <option value="">全部分区</option>
              <option v-for="section in governanceSections" :key="section" :value="section">{{ section }}</option>
            </select>
          </div>
        </div>

        <div class="queueSummary">
          当前待处理 <strong>{{ pendingGovernanceCount }}</strong> 项
        </div>

        <div class="filterSummary">
          当前筛选：{{ governanceFilterSummary }}
        </div>

        <div v-if="governanceItems.length === 0" class="emptyDetail compactEmpty">
          现在没有新的治理建议。等巡检或整理过程发现问题，这里会再提醒你。
        </div>

        <div v-else class="entryList">
          <button
            v-for="item in governanceItems"
            :key="item.requestId"
            class="entryRow"
            :class="{ active: item.requestId === selectedGovernanceId }"
            @click="selectGovernance(item.requestId)"
          >
            <div>
              <div class="entryMain">{{ item.title || item.requestType }}</div>
              <div class="entryMeta">{{ item.queueSection }} · {{ item.status }} · {{ item.riskLevel }}</div>
            </div>
          </button>
        </div>
      </section>

      <section class="workspaceCard">
        <div class="cardHead">
          <div>
            <div class="cardTitle">治理详情</div>
            <div class="cardSubhint">先看清楚为什么建议这样处理，再决定是接受、稍后再看，还是直接驳回。</div>
          </div>
          <div class="cardHint">巡检入池的修复建议、归档候选，都会在这里等你慢慢看。</div>
        </div>

        <div v-if="governanceDetail" class="governanceDetail">
          <div class="detailTitle">{{ governanceDetail.title || governanceDetail.requestType }}</div>
          <div class="detailBadgeRow">
            <span class="detailBadge">建议</span>
            <span class="detailBadge">{{ governanceDetail.status }}</span>
            <span class="detailBadge">{{ governanceDetail.riskLevel || 'unknown risk' }}</span>
          </div>
          <div class="detailMetaGrid">
            <div class="detailMetaCard">
              <div class="detailMetaLabel">状态</div>
              <div class="detailMetaValue">{{ governanceDetail.status }}</div>
            </div>
            <div class="detailMetaCard">
              <div class="detailMetaLabel">来源</div>
              <div class="detailMetaValue">{{ governanceDetail.triggerSource || 'unknown' }}</div>
            </div>
            <div class="detailMetaCard">
              <div class="detailMetaLabel">分区</div>
              <div class="detailMetaValue">{{ governanceDetail.queueSection || 'unknown' }}</div>
            </div>
            <div class="detailMetaCard">
              <div class="detailMetaLabel">页面</div>
              <div class="detailMetaValue">{{ (governanceDetail.pageIds || []).join(', ') || '无' }}</div>
            </div>
            <div class="detailMetaCard">
              <div class="detailMetaLabel">主题</div>
              <div class="detailMetaValue">{{ (governanceDetail.topicKeys || []).join(', ') || '无' }}</div>
            </div>
            <div class="detailMetaCard">
              <div class="detailMetaLabel">筛选视角</div>
              <div class="detailMetaValue">{{ governanceFilterSummary }}</div>
            </div>
          </div>

          <div class="detailSection">
            <div class="evidenceTitle">为什么建议这样处理</div>
            <div class="detailText">{{ governanceDetail.reason || '暂无原因说明' }}</div>
          </div>

          <div class="detailSection">
            <div class="evidenceTitle">建议动作</div>
            <div v-if="governanceSuggestedActions.length > 0" class="suggestionList">
              <div v-for="item in governanceSuggestedActions" :key="item" class="suggestionItem">{{ item }}</div>
            </div>
            <div v-else class="emptyInline">当前没有额外的建议动作参数。</div>
          </div>

          <div class="evidenceBlock">
            <div class="evidenceTitle">证据与依据</div>
            <div v-if="governanceEvidenceItems.length > 0" class="evidenceCards">
              <div v-for="item in governanceEvidenceItems" :key="item.id" class="evidenceCard">
                <div class="evidenceSummary">{{ item.summary }}</div>
                <pre class="evidenceItem">{{ item.body }}</pre>
              </div>
            </div>
            <div v-else class="emptyInline">这条治理建议当前没有附带更多证据。</div>
          </div>

          <div class="actionRow">
            <button :disabled="saving || governanceDetail.status === 'approved'" @click="changeGovernanceStatus(governanceDetail.requestId, 'approved')">
              标记已处理
            </button>
            <button :disabled="saving || governanceDetail.status === 'deferred'" @click="changeGovernanceStatus(governanceDetail.requestId, 'deferred')">
              稍后再看
            </button>
            <button :disabled="saving || governanceDetail.status === 'rejected'" @click="changeGovernanceStatus(governanceDetail.requestId, 'rejected')">
              驳回建议
            </button>
          </div>
        </div>
        <div v-else class="emptyDetail">点左边一条治理请求，我就把它的原因、证据和处理入口摊给你看。</div>
      </section>

      <section class="workspaceCard span2">
        <div class="cardHead">
          <div>
            <div class="cardTitle">高风险确认中心</div>
            <div class="cardSubhint">这里放的是会真正触发动作的高风险请求，所以铃湾一定会先停下来问你。</div>
          </div>
          <div class="cardFilters">
            <select v-model="confirmationFilterStatus" @change="refreshConfirmations">
              <option value="">全部状态</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
        </div>

        <div class="queueSummary">
          当前待确认 <strong>{{ pendingConfirmationCount }}</strong> 项
        </div>

        <div v-if="confirmations.length > 0" class="confirmGrid">
          <ConfirmCard
            v-for="confirmation in confirmations"
            :key="confirmation.id"
            :request="confirmation.confirmRequest || {}"
            :status="resolveConfirmationState(confirmation)"
            :error-message="confirmErrorMap[confirmation.id] || ''"
            @confirm="handleConfirmationAction('approve', confirmation)"
            @reject="handleConfirmationAction('reject', confirmation)"
          />
        </div>
        <div v-else class="emptyDetail">现在没有排队等你点头的高风险动作，小铃湾先乖乖看着。</div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.workspaceShell{
  display:flex;
  flex-direction:column;
  gap: 14px;
  min-height: 0;
}
.workspaceHead{
  display:flex;
  justify-content: space-between;
  align-items:flex-start;
  gap: 12px;
}
.workspaceTitle{ font-size: 22px; font-weight: 800; }
.workspaceHint{ margin-top: 6px; color: var(--muted); font-size: 13px; line-height: 1.5; max-width: 720px; }
.headActions{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
}
.workspaceError{
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(248,113,113,.35);
  background: rgba(248,113,113,.08);
  color: rgba(254,226,226,.95);
}
.workspaceGrid{
  display:grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}
.workspaceCard{
  background: rgba(255,255,255,.05);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 16px;
  display:flex;
  flex-direction:column;
  gap: 14px;
  min-height: 0;
}
.span2{ grid-column: 1 / -1; }
.cardHead{
  display:flex;
  justify-content: space-between;
  align-items:flex-start;
  gap: 12px;
}
.cardTitle{ font-weight: 800; font-size: 16px; }
.cardHint{ color: var(--muted); font-size: 12px; max-width: 360px; text-align: right; line-height: 1.5; }
.cardSubhint{ margin-top: 4px; color: var(--muted); font-size: 12px; }
.cardFilters{
  display:flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filterSummary{
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(125,211,252,.20);
  background: rgba(125,211,252,.06);
  color: rgba(224,242,254,.88);
  font-size: 13px;
}
.emptyState{
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px dashed var(--border);
  background: rgba(255,255,255,.03);
  color: var(--muted);
  line-height: 1.6;
}
.entryList{
  display:flex;
  flex-direction:column;
  gap: 8px;
  overflow:auto;
}
.entryRow{
  text-align:left;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
}
.entryRow.active{
  background: rgba(125,211,252,.12);
  border-color: rgba(125,211,252,.35);
}
.entryMain{ font-weight: 700; }
.entryMeta{ margin-top: 4px; font-size: 12px; color: var(--muted); }
.formGrid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.formGrid label{
  display:flex;
  flex-direction:column;
  gap: 6px;
  font-size: 13px;
}
.formGrid .span2{
  grid-column: 1 / -1;
}
.actionRow{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
}
.queueSummary{
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(255,255,255,.14);
  background: rgba(255,255,255,.03);
  color: var(--muted);
  font-size: 13px;
}
.topicGrid{
  display:grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}
.versionGrid{
  display:grid;
  grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}
.versionList{
  display:flex;
  flex-direction:column;
  gap: 8px;
  overflow:auto;
}
.versionDetail{
  min-width: 0;
}
.topicList{
  display:flex;
  flex-direction:column;
  gap: 8px;
  overflow:auto;
}
.topicDetail,
.governanceDetail,
.emptyDetail{
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255,255,255,.03);
  padding: 16px;
}
.detailTitle{ font-weight: 800; font-size: 18px; }
.detailBadgeRow{
  margin-top: 10px;
  display:flex;
  gap: 8px;
  flex-wrap: wrap;
}
.detailBadge{
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.05);
  color: rgba(255,255,255,.82);
  font-size: 11px;
}
.detailMeta{ margin-top: 8px; color: var(--muted); font-size: 13px; line-height: 1.5; }
.detailMetaGrid{
  margin-top: 14px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.detailMetaCard{
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 14px;
  background: rgba(255,255,255,.03);
  padding: 12px;
}
.detailMetaLabel{
  font-size: 11px;
  color: var(--muted);
}
.detailMetaValue{
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255,255,255,.90);
  word-break: break-word;
}
.detailSection{
  margin-top: 14px;
}
.detailText{
  margin-top: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.suggestionList{
  margin-top: 10px;
  display:flex;
  flex-direction:column;
  gap: 8px;
}
.suggestionItem{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.03);
  color: rgba(255,255,255,.88);
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}
.warningItem{
  border-color: rgba(248, 113, 113, .24);
  background: rgba(248, 113, 113, .08);
}
.topicAliases{
  display:flex;
  flex-direction:column;
  gap: 6px;
  margin-top: 12px;
  font-size: 13px;
}
.relationshipGrid select{
  min-height: 160px;
}
.evidenceBlock{
  margin-top: 14px;
  display:flex;
  flex-direction:column;
  gap: 10px;
}
.evidenceTitle{
  font-size: 13px;
  font-weight: 700;
}
.evidenceCards{
  display:flex;
  flex-direction:column;
  gap: 10px;
}
.evidenceCard{
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255,255,255,.02);
  padding: 12px;
}
.evidenceSummary{
  font-size: 12px;
  font-weight: 700;
  color: rgba(248,250,252,.92);
  margin-bottom: 8px;
}
.evidenceItem{
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(15,23,42,.55);
  color: rgba(226,232,240,.92);
  font-size: 12px;
  white-space: pre-wrap;
  overflow:auto;
}
.emptyInline{
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px dashed rgba(255,255,255,.14);
  background: rgba(255,255,255,.02);
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.confirmGrid{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}
.emptyDetail{
  color: var(--muted);
  display:grid;
  place-items:center;
  min-height: 180px;
  text-align:center;
  line-height: 1.6;
}
.compactEmpty{
  min-height: 120px;
}
@media (max-width: 1120px){
  .workspaceGrid,
  .topicGrid,
  .versionGrid{
    grid-template-columns: 1fr;
  }
}
@media (max-width: 720px){
  .workspaceHead,
  .cardHead{
    flex-direction: column;
  }
  .cardHint{
    text-align:left;
  }
  .formGrid{
    grid-template-columns: 1fr;
  }
  .detailMetaGrid{
    grid-template-columns: 1fr;
  }
}
</style>
