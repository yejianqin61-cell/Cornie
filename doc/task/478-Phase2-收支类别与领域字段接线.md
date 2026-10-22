# 478 Phase 2 收支类别与领域字段接线

## 1. Where this task sits

- **Phase 2 日常业务都能真实落库**：目标是一个工作日的六类业务能保存并重载。
- 本任务落实 **R-4 补齐收支类别与记录的完整业务链**，让收支页使用真实类别与领域字段。
- 开始前需要任务 477 的契约；完成后跨模块演示可展示正确月汇总。

## 2. What the developer needs to know

**Read first**

- `src/renderer/api/ledger.js` — 缺少的类别读取与响应转换在哪里补。
- `src/renderer/components/ledger/LedgerHomePage.vue` — 当前记录、类别和汇总的字段假设。
- `src/renderer/components/ledger/LedgerTransactionForm.vue` — 表单需要的类别和值字段。
- `electron/backend/ledger/routes.js` — 服务端返回 `items`、`entry` 与类别字段。
- `electron/backend/ledger/service.js` — 记录时间、类别和金额的唯一领域事实。

**Settled**

- 类别从 `/api/ledger/categories` 单独读取。
- `occurredAt` 在前端边界映射为页面使用的日期字段。
- 汇总只读取已保存记录；不另建汇总端点。

**Edges and seam**

- 接缝是 `api/ledger.js` 到 `LedgerHomePage.vue`。
- 不增加类别编辑或高级筛选。

**Run**

- `node tests/services/phase2-ledger-contract.test.mjs`
- `npx vitest run src/renderer/components/ledger/ledger.test.js --maxWorkers=1`
- `npm run build`。

**Unknowns**

- 若表单要求的类别字段未由服务端提供，保留 ID 与名称，不猜测默认类目。
- 若旧 `entries` 字段无调用者，删除旧回退而非保留两套模型。

## 3. The workflow

1. 阅读第 2 部分，复述：在 API 边界统一类别、日期和记录字段。
2. 为类别读取和记录映射写失败测试。
3. 补最小 API 适配器，产出稳定的页面对象。
4. 让收支页并行加载类别与记录，产出可选类别的表单。
5. 以真实记录验证月汇总，运行三个命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 类别读取 | 无筛选 | 页面得到类别数组 | `listLedgerCategories()` |
| 时间映射 | `occurredAt` | 页面得到日期字段 | `listEntries()` |
| 金额映射 | 66 | 汇总计入 66 | `LedgerHomePage` |
| 类别显示 | 餐饮记录 | 表单可选餐饮 | `LedgerTransactionForm` |
| 加载失败 | 类别请求失败 | 显示重试状态 | `LedgerHomePage` |
