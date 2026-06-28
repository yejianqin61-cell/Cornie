# task-009 收支首页、记一笔、详情编辑与类目管理页

## 目标

重构收支模块全部页面。重点是"记得快、看得懂、改得了"。

## 背景

当前 `LedgerWorkspace.vue` 承载了收支的全部 UI。需拆分为独立页面：首页、记一笔、详情编辑、类目管理。

## 关联设计文档

- `Cornie-0628-前端能力边界与人类可见接口设计.md` §9.3
- `Cornie-0628-前端首页原型结构草案.md` §6
- `Cornie-0628-前端页面清单与树状入口图.md` §5.3, §8.3

## 影响文件

| 文件 | 操作 |
|---|---|
| `src/renderer/components/LedgerHome.vue` | **新建** |
| `src/renderer/components/LedgerEntryForm.vue` | **新建** |
| `src/renderer/components/LedgerEntryDetail.vue` | **新建** |
| `src/renderer/components/LedgerCategoryManage.vue` | **新建** |
| `src/renderer/components/LedgerWorkspace.vue` | 删除（由上述拆分替代） |

## 变更规格

### LedgerHome.vue — 收支首页

**首屏结构**（4 个区块）：

1. **本月概览**
   - 本月收入、本月支出、简短余额感知
   - 简洁的数字 + 标签，不做复杂图表
   - 背景使用 `var(--ledger-tint)` 浅绿底

2. **快速记一笔区**
   - 金额输入
   - 收入/支出切换
   - 类目选择（下拉）
   - 备注（可选）
   - 保存按钮（`var(--accent)`）

3. **最近记录**
   - 最近 5-10 条
   - 每条：日期、类目、金额、类型
   - 可点进详情编辑
   - "查看全部" 可展开更多

4. **类目入口**
   - 简洁入口按钮 → LedgerCategoryManage
   - 非复杂管理面板

**禁止**：AI 建议记账过程、类目映射过程、内部 ledger 结构

### LedgerEntryForm.vue — 记一笔页

- 完整的记账表单
- 金额、类型、类目、日期、备注、商家/事项
- 保存/取消 按钮
- 返回导航

### LedgerEntryDetail.vue — 收支记录详情/编辑页

- 显示/编辑完整字段
- 保存/删除 按钮
- 删除需确认
- 返回导航

### LedgerCategoryManage.vue — 类目管理页

- 收入类目列表 + 支出类目列表
- 新增/编辑/删除 类目
- 删除类目需确认
- 返回导航
- 简洁，不做批量治理

**API**：复用现有 ledger 相关 API（`listLedgerEntries`、`createExpenseEntry`、`createIncomeEntry`、`updateLedgerEntry`、`deleteLedgerEntry`、`listLedgerCategories`、`createExpenseCategory`、`createIncomeCategory`、`updateLedgerCategory`、`restoreLedgerCategory`）

## 验收条件

1. 收支首页显示本月概览 + 快速记一笔 + 最近记录
2. 可快速记账
3. 可查看/编辑/删除已有记录
4. 可管理类目
5. 删除操作有确认提示
6. 无 AI 过程暴露
7. 视觉使用 `var(--ledger-tint)` 浅绿底调

## 依赖

- task-001（全局样式）
- task-002（导航壳层，mode='ledger' 映射到 LedgerHome）
