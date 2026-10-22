# 487 Phase 3 治理证据与决策闭环

## 1. Where this task sits

- **Phase 3 记忆能力成为 Demo 的主角**：目标是高风险变更由人决定并可解释。
- 本任务补齐治理详情、证据、批准、拒绝和应用结果。
- **开始前**：任务 484 产出治理请求。**等待它**：任务 490 的演示脚本。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/memory/MemoryWikiHomePage.vue` — 当前治理面板只显示摘要。
- `src/renderer/api/memory-wiki.js` — 详情、状态和应用入口。
- `electron/backend/memory-wiki/governanceStore.js` — 请求状态与证据字段。
- `electron/backend/memory-wiki/routes.js` — 真实治理端点。

**Settled**

- 高风险请求必须先批准，才可应用。
- 拒绝只改变请求状态，不改变记忆页。
- 页面必须显示证据和最近应用结果。

**Edges and seam**

- 接缝是治理面板到既有 governance API。
- 不新增自动批准或批量治理。

**Run**

- `npx vitest run src/renderer/components/memory --maxWorkers=1`
- `node tests/memory-governance/memory-governance.test.mjs`

**Unknowns**

- 若请求没有证据，显示明确空态；不能伪造来源。

## 3. The workflow

1. 阅读第 2 部分，复述：用户在一个面板内看证据、作决定并看结果。
2. 为 pending 请求详情写失败测试。
3. 为批准、应用和拒绝写失败测试。
4. 接线既有 API 并成功后重载队列。
5. 运行命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 请求详情 | pending ID | 显示原因和证据 | `getGovernanceRequest()` |
| 批准 | pending ID | 状态为 approved | `updateGovernanceStatus()` |
| 应用 | approved ID | 显示 applied 结果 | `applyGovernanceRequest()` |
| 拒绝 | pending ID | 状态为 rejected | `updateGovernanceStatus()` |
| 请求失败 | 500 响应 | 显示重试入口 | 治理面板 |
