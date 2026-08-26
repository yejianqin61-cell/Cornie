<script setup>
import { useMemoryWikiWorkspace } from '../composables/useMemoryWikiWorkspace'
// FE-09：工作台按职责拆分——各区块独立组件，本文件只做组合与状态协调。
import MemoryWikiConfirmationPanel from './MemoryWikiConfirmationPanel.vue'
import MemoryWikiGovernanceDetailPanel from './MemoryWikiGovernanceDetailPanel.vue'
import MemoryWikiGovernanceQueuePanel from './MemoryWikiGovernanceQueuePanel.vue'
import MemoryWikiPageEditorPanel from './MemoryWikiPageEditorPanel.vue'
import MemoryWikiPageListPanel from './MemoryWikiPageListPanel.vue'
import MemoryWikiTopicIndexPanel from './MemoryWikiTopicIndexPanel.vue'
import MemoryWikiVersionPanel from './MemoryWikiVersionPanel.vue'
import MemoryWikiWorkspaceHead from './MemoryWikiWorkspaceHead.vue'

// F-07：编排逻辑收敛到 useMemoryWikiWorkspace composable，本组件只保留模板组合。
const {
  loading,
  saving,
  errorMsg,
  pages,
  topicItems,
  governanceItems,
  confirmations,
  pageVersions,
  selectedVersionId,
  versionDiff,
  pageSourceTrace,
  topicSourceTrace,
  selectedPageId,
  selectedTopicKey,
  selectedGovernanceId,
  pageFilterType,
  pageFilterStatus,
  governanceFilterStatus,
  governanceFilterSection,
  confirmationFilterStatus,
  pageForm,
  topicDetail,
  governanceDetail,
  pageTopicKeyword,
  pageTopicAliasesText,
  pageTopicNote,
  relatedPageSelection,
  confirmStatusMap,
  confirmErrorMap,
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
  refreshPages,
  refreshGovernanceItems,
  refreshConfirmations,
  refreshAll,
  selectPage,
  selectTopic,
  selectGovernance,
  resetPageForm,
  selectVersion,
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
} = useMemoryWikiWorkspace()
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
.workspaceError {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--color-danger-soft);
  color: var(--danger);
}
.workspaceGrid {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}
@media (max-width: 1120px) {
  .workspaceGrid {
    grid-template-columns: 1fr;
  }
}
</style>
