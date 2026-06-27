<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  archiveMemoryWikiPage,
  createMemoryWikiPage,
  getMemoryWikiPage,
  getTopicIndexItem,
  listMemoryWikiPages,
  listTopicIndexItems,
  restoreMemoryWikiPage,
  rollbackMemoryWikiPage,
  setMemoryWikiImportance,
  setMemoryWikiStatus,
  updateMemoryWikiAliases,
  updateMemoryWikiPage,
  updateTopicIndexAliases
} from '../api'

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')

const pages = ref([])
const topicItems = ref([])
const selectedPageId = ref('')
const selectedTopicKey = ref('')

const pageFilterType = ref('')
const pageFilterStatus = ref('')

const pageForm = ref(createEmptyPageForm())
const topicDetail = ref(null)

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

async function refreshAll() {
  loading.value = true
  errorMsg.value = ''
  try {
    await Promise.all([refreshPages(), refreshTopicItems()])
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
    topicDetail.value = data.item
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

onMounted(refreshAll)
</script>

<template>
  <section class="workspaceShell">
    <header class="workspaceHead">
      <div>
        <div class="workspaceTitle">Memory Wiki 工作台</div>
        <div class="workspaceHint">主人可以直接看长期记忆页面、主题索引，还有它们之间的组织方式。</div>
      </div>
      <button :disabled="loading" @click="refreshAll">{{ loading ? '刷新中…' : '刷新' }}</button>
    </header>

    <div v-if="errorMsg" class="workspaceError">{{ errorMsg }}</div>

    <div class="workspaceGrid">
      <section class="workspaceCard">
        <div class="cardHead">
          <div class="cardTitle">记忆页面</div>
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

        <div class="entryList">
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
          <div class="cardTitle">{{ selectedPage ? '编辑页面' : '新建页面' }}</div>
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
          <div class="cardTitle">Topic Index</div>
          <div class="cardHint">这里能看到主题关键词、热度、日期，以及它们连到了哪些记忆页面。</div>
        </div>

        <div class="topicGrid">
          <div class="topicList">
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
            <div class="detailMeta">normalizedKey: {{ topicDetail.normalizedKey }}</div>
            <div class="detailMeta">相关日期：{{ (topicDetail.dates || []).join(', ') || '无' }}</div>
            <div class="detailMeta">关联页面：{{ (topicDetail.pageIds || []).join(', ') || '无' }}</div>
            <label class="topicAliases">
              <span>别名（逗号分隔）</span>
              <input v-model="topicDetail.aliasesText" />
            </label>
            <button :disabled="saving" @click="saveTopicAliases">保存主题别名</button>
          </div>
          <div v-else class="emptyDetail">点一个主题，我就把它的索引详情展开给主人看。</div>
        </div>
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
.workspaceHint{ margin-top: 6px; color: var(--muted); font-size: 13px; }
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
.cardHint{ color: var(--muted); font-size: 12px; max-width: 360px; text-align: right; }
.cardFilters{
  display:flex;
  gap: 8px;
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
.emptyDetail{
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255,255,255,.03);
  padding: 16px;
}
.detailTitle{ font-weight: 800; font-size: 18px; }
.detailMeta{ margin-top: 8px; color: var(--muted); font-size: 13px; line-height: 1.5; }
.topicAliases{
  display:flex;
  flex-direction:column;
  gap: 6px;
  margin-top: 12px;
  font-size: 13px;
}
.emptyDetail{
  color: var(--muted);
  display:grid;
  place-items:center;
  min-height: 180px;
  text-align:center;
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
