# 157-MemoryWiki工作台剩余编辑治理与确认状态覆盖补齐

## 1. 任务目标

在 `8.5 前端测试脚手架与回归模块` 内，继续针对 `MemoryWikiWorkspace.vue` 的剩余编辑表单、治理详情、确认状态与异常分支补测试，优先处理当前前端 coverage 中最明显的低覆盖热点。

本任务完成后仍必须重新运行真实前端覆盖率校验；若总体仍未达到 `95%+`，则继续停留在 `8.5`，不得进入 `8.6`。

## 2. 背景与现状

根据当前 `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md` 与最新 coverage 报告：

- `MemoryWikiWorkspace.vue`
  - Statements：`89.76%`
  - Branches：`71.86%`
  - Functions：`82.75%`
  - Lines：`90.83%`

虽然主链路、基础治理流、Topic Index 空态、确认空态、回滚取消等已覆盖，但该页面仍是当前 `8.5` 的头号阻塞项。

当前剩余空白主要集中在：

1. 页面详情默认值回退与编辑表单状态保存
2. 页面筛选刷新与列表空值回退
3. Topic / Governance 详情读取失败分支
4. 治理状态变更后的重新选择分支与失败分支
5. 确认状态回退、`followupConfirmation.status` 分支与空请求卡片分支
6. 若干早退分支与 `String(error)` 兜底

## 3. 开发范围

本任务仅处理前端测试、测试 mock 增强，以及必要时极小范围的前端兼容性修正，不改变业务语义。

涉及文件：

- `tests/frontend/memory-wiki-workspace-async.test.mjs`
- 如有必要，可增补对应测试 helper
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`

## 4. 具体开发项

### 4.1 页面编辑与默认值回退

补测试覆盖以下行为：

1. `selectPage` 返回缺省字段时，`pageType / status / importance / title / summary / body / aliasesText` 正确回退默认值
2. 编辑已有页面时走 `updateMemoryWikiPage` 分支，而不是新建分支
3. 页面类型、状态、重要性修改后，保存请求正确带出更新值

### 4.2 页面筛选与刷新异常

补测试覆盖以下行为：

1. 页面类型筛选切换后重新请求列表
2. 页面状态筛选切换后重新请求列表
3. `refreshPages / refreshTopicItems / refreshGovernanceItems / refreshConfirmations` 对 `data.items || []`、`data.confirmations || []` 的空值回退
4. `refreshAll` 失败时展示 `String(error)` 兜底错误

### 4.3 Topic / Governance 详情异常与早退

补测试覆盖以下行为：

1. `selectTopic` 请求失败时展示友好错误
2. `selectGovernance` 请求失败时展示友好错误
3. `saveTopicAliases` 在缺少 `normalizedKey` 时早退，不发请求
4. `runInspectionScan` 失败时展示错误

### 4.4 治理状态变更边界

补测试覆盖以下行为：

1. 已选治理项执行状态变更后，触发重新读取详情
2. 治理状态更新失败时展示错误
3. `triggerSource / queueSection / pageIds / topicKeys` 缺失时的详情回退显示

### 4.5 确认状态与空请求分支

补测试覆盖以下行为：

1. `resolveConfirmationState` 当 `confirmStatusMap` 为空、`confirmation.status` 为空时回退到 `pending`
2. `handleConfirmationAction` 使用 `followupConfirmation.status` 的分支
3. `confirmation.confirmRequest || {}` 的空请求卡片分支
4. 缺少标题、原因、细节时卡片仍可渲染且不报错

### 4.6 页面动作早退分支

补测试覆盖以下行为：

1. 未选页面时点击归档、恢复、回滚不会发请求
2. 已重置为新建页面后，动作按钮不再渲染可触发路径

## 5. 验收标准

完成本任务时，至少应满足：

1. 新增测试全部通过
2. `npm.cmd run test:frontend` 通过
3. `npm.cmd run test:frontend:coverage` 通过
4. `MemoryWikiWorkspace.vue` 覆盖率相较任务前继续明显提升，尤其是 branch / function 指标
5. 更新 `8.5` 阶段验收文档中的测试数、覆盖率与阶段判断

## 6. 备注

本任务完成后，必须继续依据真实 coverage 判断 `8.5` 是否已收口。

若 `MemoryWikiWorkspace.vue` 仍是主要低覆盖热点，则继续围绕它拆下一份 task；若热点转移，再根据最新覆盖率选择新的页面或组件继续补齐。
