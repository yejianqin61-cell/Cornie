// 治理工作台组合根（React 版 components/MemoryWikiWorkspace.vue）。
// 只做 7 个面板的 props 接线与状态协调：编排逻辑在 useMemoryWikiWorkspace hook；
// 两列 Grid（minmax(260px,320px)+1fr 的旧布局语义 → PageList/Editor、Queue/Detail 各占一列，
// Version/TopicIndex/Confirmation 整行），≤md 折为单列；筛选变更"先改值再刷新"用 overrides 直传。
import { Alert, Grid, Stack } from '@mantine/core'

import { useMemoryWikiWorkspace } from '../../hooks/useMemoryWikiWorkspace'
import MemoryWikiConfirmationPanel from './MemoryWikiConfirmationPanel'
import MemoryWikiGovernanceDetailPanel from './MemoryWikiGovernanceDetailPanel'
import MemoryWikiGovernanceQueuePanel from './MemoryWikiGovernanceQueuePanel'
import MemoryWikiPageEditorPanel from './MemoryWikiPageEditorPanel'
import MemoryWikiPageListPanel from './MemoryWikiPageListPanel'
import MemoryWikiTopicIndexPanel from './MemoryWikiTopicIndexPanel'
import MemoryWikiVersionPanel from './MemoryWikiVersionPanel'
import MemoryWikiWorkspaceHead from './MemoryWikiWorkspaceHead'

export default function MemoryWikiWorkspace() {
  const ws = useMemoryWikiWorkspace()

  return (
    <Stack gap={14}>
      <MemoryWikiWorkspaceHead
        loading={ws.loading}
        saving={ws.saving}
        onRunInspection={() => void ws.runInspectionScan()}
        onRefresh={() => void ws.refreshAll()}
      />

      {ws.errorMsg ? (
        <Alert color="danger" variant="light">
          {ws.errorMsg}
        </Alert>
      ) : null}

      <Grid gap={14}>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <MemoryWikiPageListPanel
            pages={ws.pages}
            selectedPageId={ws.selectedPageId}
            filterType={ws.pageFilterType}
            filterStatus={ws.pageFilterStatus}
            onSelectPage={(pageId) => void ws.selectPage(pageId)}
            onFilterTypeChange={(value) => {
              ws.setPageFilterType(value)
              void ws.refreshPages({ pageType: value })
            }}
            onFilterStatusChange={(value) => {
              ws.setPageFilterStatus(value)
              void ws.refreshPages({ status: value })
            }}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <MemoryWikiPageEditorPanel
            pageForm={ws.pageForm}
            onFormChange={(patch) => ws.setPageForm((prev) => ({ ...prev, ...patch }))}
            selectedPage={ws.selectedPage}
            saving={ws.saving}
            pageSourceTrace={ws.pageSourceTrace}
            selectedVersionId={ws.selectedVersionId}
            identityPageOptions={ws.identityPageOptions}
            identityRelationshipRules={ws.identityRelationshipRules}
            identityRelationshipCandidates={ws.identityRelationshipCandidates}
            identityRelationshipWarnings={ws.identityRelationshipWarnings}
            relatedPageIssues={ws.relatedPageIssues}
            relatedPageSelection={ws.relatedPageSelection}
            onRelatedPageSelectionChange={ws.setRelatedPageSelection}
            pageTopicKeyword={ws.pageTopicKeyword}
            onPageTopicKeywordChange={ws.setPageTopicKeyword}
            pageTopicAliasesText={ws.pageTopicAliasesText}
            onPageTopicAliasesTextChange={ws.setPageTopicAliasesText}
            pageTopicNote={ws.pageTopicNote}
            onPageTopicNoteChange={ws.setPageTopicNote}
            onReset={ws.resetPageForm}
            onSave={() => void ws.savePage()}
            onArchive={() => void ws.archivePage()}
            onRestore={() => void ws.restorePage()}
            onRollback={() => void ws.rollbackPage()}
            onSaveRelatedPages={() => void ws.saveRelatedPages()}
            onLinkTopic={() => void ws.linkSelectedPageToTopic()}
          />
        </Grid.Col>

        <Grid.Col span={12}>
          <MemoryWikiVersionPanel
            pageId={ws.pageForm.pageId}
            pageVersions={ws.pageVersions}
            selectedVersionId={ws.selectedVersionId}
            selectedVersion={ws.selectedVersion}
            versionDiff={ws.versionDiff}
            onSelectVersion={(versionId) => void ws.selectVersion(versionId)}
          />
        </Grid.Col>

        <Grid.Col span={12}>
          <MemoryWikiTopicIndexPanel
            topicItems={ws.topicItems}
            selectedTopicKey={ws.selectedTopicKey}
            topicDetail={ws.topicDetail}
            onTopicDetailChange={(patch) => ws.setTopicDetail((prev) => (prev ? { ...prev, ...patch } : prev))}
            topicSourceTrace={ws.topicSourceTrace}
            saving={ws.saving}
            onSelectTopic={(normalizedKey) => void ws.selectTopic(normalizedKey)}
            onSaveTopicAliases={() => void ws.saveTopicAliases()}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <MemoryWikiGovernanceQueuePanel
            governanceItems={ws.governanceItems}
            selectedGovernanceId={ws.selectedGovernanceId}
            filterStatus={ws.governanceFilterStatus}
            filterSection={ws.governanceFilterSection}
            sections={ws.governanceSections}
            pendingCount={ws.pendingGovernanceCount}
            filterSummary={ws.governanceFilterSummary}
            onSelectGovernance={(requestId) => void ws.selectGovernance(requestId)}
            onFilterStatusChange={(value) => {
              ws.setGovernanceFilterStatus(value)
              void ws.refreshGovernanceItems({ status: value })
            }}
            onFilterSectionChange={(value) => {
              ws.setGovernanceFilterSection(value)
              void ws.refreshGovernanceItems({ queueSection: value })
            }}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <MemoryWikiGovernanceDetailPanel
            detail={ws.governanceDetail}
            evidenceItems={ws.governanceEvidenceItems}
            suggestedActions={ws.governanceSuggestedActions}
            filterSummary={ws.governanceFilterSummary}
            saving={ws.saving}
            onApprove={() => void ws.changeGovernanceStatus(ws.governanceDetail?.requestId ?? '', 'approved')}
            onDefer={() => void ws.changeGovernanceStatus(ws.governanceDetail?.requestId ?? '', 'deferred')}
            onReject={() => void ws.changeGovernanceStatus(ws.governanceDetail?.requestId ?? '', 'rejected')}
          />
        </Grid.Col>

        <Grid.Col span={12}>
          <MemoryWikiConfirmationPanel
            confirmations={ws.confirmations}
            filterStatus={ws.confirmationFilterStatus}
            onFilterStatusChange={(value) => {
              ws.setConfirmationFilterStatus(value)
              void ws.refreshConfirmations({ status: value })
            }}
            pendingCount={ws.pendingConfirmationCount}
            statusMap={ws.confirmStatusMap}
            errorMap={ws.confirmErrorMap}
            onConfirm={(confirmation) => void ws.handleConfirmationAction('approve', confirmation)}
            onReject={(confirmation) => void ws.handleConfirmationAction('reject', confirmation)}
          />
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
