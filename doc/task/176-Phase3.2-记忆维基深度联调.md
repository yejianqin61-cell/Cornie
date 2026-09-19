# 176-Phase3.2-记忆维基深度联调

## 目标

补全记忆维基模块的深度功能：版本对比 API 接入、Topic 筛选接入、治理面板、缺失 API 函数。

## 当前状态

- MemoryWikiHomePage 已调用 listPages / getPage / createPage / updatePage API
- MemoryWikiCompare 为静态 UI，未调用 getVersionDiff
- MemoryWikiTree 未集成 TopicChip 筛选
- 缺少 archive / restore / rollback / merge / governance API 函数
- 缺少治理面板组件

## 改造范围

### 1. API 补齐 (`src/renderer/api/memory-wiki.js`)

新增：
- `archivePage(pageId)` → POST `/api/memory-wiki/pages/:pageId/archive`
- `restorePage(pageId)` → POST `/api/memory-wiki/pages/:pageId/restore`
- `rollbackPage(pageId, versionId)` → POST `/api/memory-wiki/pages/:pageId/rollback`
- `mergePages(targetPageId, sourcePageId)` → POST `/api/memory-wiki/pages/merge`
- `updatePageStatus(pageId, status)` → PUT `/api/memory-wiki/pages/:pageId/status`
- `updatePageImportance(pageId, importance)` → PUT `/api/memory-wiki/pages/:pageId/importance`
- `listGovernanceRequests(params)` → GET `/api/memory-wiki/governance`
- `getGovernanceRequest(requestId)` → GET `/api/memory-wiki/governance/:requestId`
- `updateGovernanceStatus(requestId, status)` → PUT `/api/memory-wiki/governance/:requestId/status`
- `applyGovernanceRequest(requestId)` → POST `/api/memory-wiki/governance/:requestId/apply`
- `inspectionScan()` → POST `/api/memory-wiki/governance/inspection-scan`

### 2. MemoryWikiHomePage.vue

- 集成 TopicChip 筛选：加载 `/api/memory-wiki/topic-index`，点击 topic 筛选页面列表
- 治理面板入口：工具栏新增 "治理" 按钮，弹窗展示 governance 列表
- 版本对比接入：点击 "历史" 时调用 `listVersions` + `getVersionDiff`

### 3. MemoryWikiCompare.vue

- 从纯静态展示改为接收 `pageId` prop
- `onMounted` 时调用 `listVersions(pageId)` 获取版本列表
- 选择两个版本后调用 `getVersionDiff(pageId, { fromVersionId, toVersionId })`
- 展示 diff 结果

### 4. 测试

在 `memory.test.js` 中新增：
- MemoryWikiCompare 版本选择与 diff 加载
- TopicChip API 集成
- 治理面板渲染

## 验收标准

- [ ] memory-wiki API 补齐 11 个端点
- [ ] MemoryWikiHomePage 集成 Topic 筛选
- [ ] MemoryWikiCompare 接入版本 diff API
- [ ] 治理面板可展示 governance 列表
- [ ] 测试通过
- [ ] `vite build` 通过