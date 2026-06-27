<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  archiveMemoryWikiPage,
  createMemoryWikiPage,
  enqueueMemoryWikiInspectionScan,
  getMemoryWikiPage,
  getMemoryWikiGovernanceRequest,
  getTopicIndexItem,
  listConfirmations,
  listMemoryWikiGovernanceRequests,
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
const confirmStatusMap = ref({})
const confirmErrorMap = ref({})

function createEmptyPageForm() {
  return {
    pageId: '',
    pageType: 'topic',
    title: '',
    summary: '',
    body: '',
    aliasesText: '',
    status: 'active',
    importance: 'medium'
  }
}

const selectedPage = computed(() => pages.value.find((item) => item.pageId === selectedPageId.value) || null)
const governanceSections = computed(() =>
  Array.from(new Set(governanceItems.value.map((item) => item.queueSection).filter(Boolean)))
)
const pendingGovernanceCount = computed(() => governanceItems.value.filter((item) => item.status === 'pending').length)
const pendingConfirmationCount = computed(() => confirmations.value.filter((item) => item.status === 'pending').length)

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
    errorMsg.value = error?.message || String(error)
  } finally {
    loading.value = false
  }
}

async function selectPage(pageId) {
  loading.value = true
  errorMsg.value = ''
  try {
    selectedPageId.value = pageId
    const data = await getMemoryWikiPage(pageId)
    const page = data.page
    pageForm.value = {
      pageId: page.pageId,
      pageType: page.pageType ?? 'topic',
      title: page.title ?? '',
      summary: page.summary ?? '',
      body: page.body ?? '',
      aliasesText: Array.isArray(page.aliases) ? page.aliases.join(', ') : '',
      status: page.status ?? 'active',
      importance: page.importance ?? 'medium'
    }
  } catch (error) {
    errorMsg.value = error?.message || String(error)
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
    topicDetail.value = {
      ...data.item,
      aliasesText: Array.isArray(data.item?.aliases) ? data.item.aliases.join(', ') : ''
    }
  } catch (error) {
    errorMsg.value = error?.message || String(error)
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
    errorMsg.value = error?.message || String(error)
  } finally {
    loading.value = false
  }
}

function resetPageForm() {
  selectedPageId.value = ''
  pageForm.value = createEmptyPageForm()
}

async function savePage() {
  saving.value = true
  errorMsg.value = ''
  try {
    const payload = {
      pageType: pageForm.value.pageType,
      title: pageForm.value.title,
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
    errorMsg.value = error?.message || String(error)
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
    errorMsg.value = error?.message || String(error)
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
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function rollbackPage() {
  if (!pageForm.value.pageId) return
  const versionId = window.prompt('请输入要回滚到的版本 ID')
  if (!versionId) return
  saving.value = true
  errorMsg.value = ''
  try {
    await rollbackMemoryWikiPage(pageForm.value.pageId, versionId)
    await refreshPages()
    await selectPage(pageForm.value.pageId)
  } catch (error) {
    errorMsg.value = error?.message || String(error)
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
    errorMsg.value = error?.message || String(error)
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
    errorMsg.value = error?.message || String(error)
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
    errorMsg.value = error?.message || String(error)
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
          <button v-if="pageForm.pageId" :disabled="saving" @click="rollbackPage">版本回滚</button>
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
            <div class="cardSubhint">当前待处理 {{ pendingGovernanceCount }} 项</div>
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

        <div class="entryList">
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
          <div class="cardTitle">治理详情</div>
          <div class="cardHint">巡检入池的修复建议、归档候选，都会在这里等你慢慢看。</div>
        </div>

        <div v-if="governanceDetail" class="governanceDetail">
          <div class="detailTitle">{{ governanceDetail.title || governanceDetail.requestType }}</div>
          <div class="detailMeta">状态：{{ governanceDetail.status }}</div>
          <div class="detailMeta">来源：{{ governanceDetail.triggerSource || 'unknown' }}</div>
          <div class="detailMeta">分区：{{ governanceDetail.queueSection || 'unknown' }}</div>
          <div class="detailMeta">页面：{{ (governanceDetail.pageIds || []).join(', ') || '无' }}</div>
          <div class="detailMeta">主题：{{ (governanceDetail.topicKeys || []).join(', ') || '无' }}</div>
          <div class="detailText">{{ governanceDetail.reason || '暂无原因说明' }}</div>

          <div class="evidenceBlock" v-if="(governanceDetail.evidence || []).length > 0">
            <div class="evidenceTitle">证据与建议</div>
            <pre
              v-for="(item, index) in governanceDetail.evidence"
              :key="`${governanceDetail.requestId}-${index}`"
              class="evidenceItem"
            >{{ formatEvidence(item) }}</pre>
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
            <div class="cardSubhint">当前待确认 {{ pendingConfirmationCount }} 项</div>
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
.topicGrid{
  display:grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
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
.detailMeta{ margin-top: 8px; color: var(--muted); font-size: 13px; line-height: 1.5; }
.detailText{
  margin-top: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.topicAliases{
  display:flex;
  flex-direction:column;
  gap: 6px;
  margin-top: 12px;
  font-size: 13px;
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
.evidenceItem{
  margin: 0;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(15,23,42,.55);
  color: rgba(226,232,240,.92);
  font-size: 12px;
  white-space: pre-wrap;
  overflow:auto;
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
@media (max-width: 1120px){
  .workspaceGrid,
  .topicGrid{
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
}
</style>
