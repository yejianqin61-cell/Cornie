# 477 Phase 2 收支真实业务契约测试

## 1. Where this task sits

- **Phase 2 日常业务都能真实落库**：目标是一个工作日的六类业务能保存并重载。
- 本任务落实 **R-4 补齐收支类别与记录的完整业务链**，先证明类别、支出和月汇总。
- 无前置任务；后续收支页面适配与跨模块演示依赖这条真实 HTTP 证明。

## 2. What the developer needs to know

**Read first**

- `electron/backend/ledger/routes.js` — 类别与记录的真实端点和响应形状。
- `electron/backend/ledger/service.js` — 类别创建、记录写入和查询的领域规则。
- `src/renderer/api/ledger.js` — 前端现有 API 是否覆盖真实端点。
- `src/renderer/components/ledger/LedgerHomePage.vue` — 月汇总和表单现在消费的字段。
- `tests/shared/service-harness.mjs` — 如何建立隔离存储与清理。

**Settled**

- 测试经过真实 HTTP 路由与隔离数据库。
- 类别先创建，再以类别 ID 创建一笔支出。
- 月汇总以同月已保存记录的金额为准。

**Edges and seam**

- 接缝是 Ledger HTTP 路由到前端 API 适配器。
- 不实现类别高级管理、导出或视觉重做。

**Run**

- `node tests/services/phase2-ledger-contract.test.mjs`
- `npx vitest run src/renderer/components/ledger/ledger.test.js --maxWorkers=1`
- `npm run build`。

**Unknowns**

- 若记录时间字段与页面 `date` 字段不同，停在适配层并记录转换来源。
- 若汇总只能在页面计算，测试仍以服务端已保存金额作独立期望。

## 3. The workflow

1. 阅读第 2 部分，复述：用真实服务证明一笔带类别的支出可进入当月汇总。
2. 写类别创建的失败测试，产出类别 ID。
3. 写支出创建与重载的失败测试，产出持久化记录。
4. 写月汇总断言，产出金额与月份的独立证明。
5. 运行三个命令并提交测试意图。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 创建类别 | 餐饮 | 返回 expense 类别 | `/ledger/categories/expense` |
| 创建支出 | 66 元午饭 | 返回类别关联记录 | `/ledger/entries/expense` |
| 同月读取 | `2026-10` | 包含该记录 | `/ledger/entries` |
| 月汇总 | 一笔 66 元支出 | 支出为 66 | `LedgerHomePage` |
| 非法金额 | 0 元 | 返回 400 | 记录路由 |
