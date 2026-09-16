# 169-Phase2.3-记账链路联调

## 1. 任务目标

将记账模块与后端 API 完整打通，覆盖 loading/empty/error 三态。

## 2. 现有组件

| 组件 | 路径 | 状态 |
|------|------|------|
| LedgerHomePage.vue | `components/ledger/LedgerHomePage.vue` | 已有 CRUD 逻辑，缺 loading/error 态 |
| LedgerTransactionForm.vue | `components/ledger/LedgerTransactionForm.vue` | 已有表单，缺 saving 态 |
| LedgerCategoryTag.vue | `components/ledger/LedgerCategoryTag.vue` | 纯展示组件 |
| LedgerSummaryCard.vue | `components/ledger/LedgerSummaryCard.vue` | 纯展示组件 |
| LedgerEmptyState.vue | `components/ledger/LedgerEmptyState.vue` | 已有 |
| ConfirmDialog.vue | `components/common/ConfirmDialog.vue` | 已有 |

## 3. 改造内容

### 3.1 LedgerHomePage.vue
- 添加 `loading` skeleton / `error` banner + 重试
- 筛选切换时刷新数据
- 删除确认后刷新列表

### 3.2 LedgerTransactionForm.vue
- 添加 `saving` 状态 + spinner
- 添加 `saveError` 错误提示

## 4. 验收标准

- [ ] 列表加载时显示 skeleton
- [ ] 加载失败显示错误 + 重试按钮
- [ ] 新增/编辑后列表刷新
- [ ] 表单保存时显示 saving 状态
- [ ] 表单保存失败显示错误
- [ ] 全部状态有对应测试覆盖