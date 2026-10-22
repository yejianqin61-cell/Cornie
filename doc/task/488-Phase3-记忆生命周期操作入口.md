# 488 Phase 3 记忆生命周期操作入口

## 1. Where this task sits

- **Phase 3 记忆能力成为 Demo 的主角**：目标是人可纠正长期记忆。
- 本任务补齐归档、恢复、回滚、重要性和状态的人类操作入口。
- **开始前**：任务 486 稳定详情状态。**等待它**：任务 490 演示纠正步骤。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/memory/MemoryWikiDetail.vue` — 当前详情页的动作插槽。
- `src/renderer/api/memory-wiki.js` — 已有生命周期 API。
- `electron/backend/memory-wiki/service.js` — 状态、重要性和回滚规则。
- `src/renderer/components/common/ConfirmDialog.vue` — 高风险确认的复用方式。

**Settled**

- 归档、恢复和回滚只在用户显式操作后调用。
- 操作成功后重载详情与列表。
- 回滚必须选择真实版本，不接受手填版本 ID。

**Edges and seam**

- 接缝是详情页动作到 Memory Wiki API。
- 不增加删除页面或批量编辑。

**Run**

- `npx vitest run src/renderer/components/memory --maxWorkers=1`
- `node tests/services/memory-wiki-service.test.mjs`

**Unknowns**

- 若状态转换被服务端拒绝，显示错误并保留当前详情。

## 3. The workflow

1. 阅读第 2 部分，复述：每次纠正都可见、可确认、可重载。
2. 为归档和恢复写失败测试。
3. 为版本选择和回滚写失败测试。
4. 为重要性与状态调整接入既有端点。
5. 运行命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 归档 | active 页 | 状态为 archived | `archivePage()` |
| 恢复 | archived 页 | 状态为 active | `restorePage()` |
| 回滚 | 可用版本 | 正文恢复到版本值 | `rollbackPage()` |
| 重要性 | high 值 | 详情显示 high | `updatePageImportance()` |
| 操作失败 | 500 响应 | 显示错误且不丢详情 | 详情页 |
