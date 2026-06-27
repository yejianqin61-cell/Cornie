# 154-Ledger工作台剩余筛选空态与类目切换覆盖补齐

## 1. 任务目标

在 `8.5 前端测试脚手架与回归模块` 内，继续补齐 `LedgerWorkspace.vue` 的剩余筛选、空态、保存失败、类目停用/恢复与早退边界分支测试，进一步推进前端覆盖率。

本任务完成后仍需根据真实 coverage 判断是否继续停留在 `8.5`，不得提前进入 `8.6`。

## 2. 背景与现状

根据当前 `coverage/frontend/coverage-summary.json`：

- `LedgerWorkspace.vue`
  - Statements：`85.93%`
  - Branches：`77.53%`
  - Functions：`88.23%`
  - Lines：`87.39%`

这是当前核心业务工作台里最明显的低覆盖热点之一。

现有测试已覆盖主链路，但仍存在明显空白：

1. `type/category` 筛选后的真实列表切换
2. `item / merchant / 未命名记录` 的展示回退分支
3. `categoryName / 未分类` 的展示回退分支
4. 保存记录失败分支
5. 类目新增默认排序 `0` 分支
6. 类目停用后恢复分支
7. `removeEntry` / `toggleCategory` 的空参数早退分支

## 3. 开发范围

涉及文件：

- `tests/frontend/ledger-workspace-async.test.mjs`
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`

必要时增强测试 mock，但不修改业务功能语义。

## 4. 具体开发项

### 4.1 列表筛选与展示回退

补测试覆盖以下行为：

1. `全部 / 支出 / 收入` 筛选切换后的真实列表变化
2. 类目筛选切换后的真实列表变化
3. `item` 为空时回退 `merchant`
4. `item` 与 `merchant` 都为空时回退 `未命名记录`
5. `categoryName` 为空时回退 `未分类`

### 4.2 保存失败与重置分支

补测试覆盖以下行为：

1. 保存记录失败时显示可读错误提示
2. 编辑已有记录后点击 `新建一条` 可回到新建态
3. 删除当前选中记录后表单复位

### 4.3 类目管理剩余分支

补测试覆盖以下行为：

1. 类目新增未填写排序时按 `0` 提交
2. 类目停用后可再次恢复
3. 类目保存失败时显示可读错误提示

### 4.4 早退与兜底分支

补测试覆盖以下行为：

1. `removeEntry(undefined)` 不触发请求
2. `toggleCategory(undefined)` 不触发请求

## 5. 验收标准

1. 新增测试全部通过
2. `npm.cmd run test:frontend` 通过
3. `npm.cmd run test:frontend:coverage` 通过
4. `LedgerWorkspace.vue` 覆盖率相较任务前有可见提升
5. 更新 `8.5` 阶段验收文档中的测试结果与覆盖率记录

## 6. 备注

若本任务完成后总体覆盖率仍未达到 `95%+`，则继续留在 `8.5`，优先处理 `MemoryWikiWorkspace.vue`、`App.vue`、`ChatHistory.vue` 等剩余热点。
