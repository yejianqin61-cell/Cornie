# 153-Schedule与Todo工作台剩余状态矩阵覆盖补齐

## 1. 任务目标

在 `8.5 前端测试脚手架与回归模块` 内，继续补齐 `ScheduleWorkspace.vue` 与 `TodoWorkspace.vue` 的剩余状态矩阵、视图切换、恢复分支、空值回退与错误分支测试，进一步推进前端覆盖率。

本任务完成后仍需根据真实 coverage 判断是否继续停留在 `8.5`，不得提前进入 `8.6`。

## 2. 背景与现状

根据当前 `coverage/frontend/coverage-summary.json`：

- `ScheduleWorkspace.vue`
  - Statements：`89.47%`
  - Branches：`74.8%`
  - Functions：`88.88%`
  - Lines：`89.84%`
- `TodoWorkspace.vue`
  - Statements：`89.31%`
  - Branches：`73.91%`
  - Functions：`88.23%`
  - Lines：`89.68%`

两者都已覆盖主链路，但还存在明显的状态矩阵空白：

1. 视图筛选切换后的真实列表变化分支
2. 编辑已有记录并回到“新建”状态的分支
3. 无类目 / 无时间 / 无日期回退展示
4. 类目从停用状态恢复的分支
5. 类目新增默认排序值分支
6. 保存失败或类目保存失败的错误提示分支

## 3. 开发范围

涉及文件：

- `tests/frontend/schedule-workspace-async.test.mjs`
- `tests/frontend/todo-workspace-async.test.mjs`
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`

必要时可增强测试 mock，但不修改业务功能语义。

## 4. 具体开发项

### 4.1 ScheduleWorkspace

补测试覆盖以下行为：

1. `upcoming / cancelled` 视图切换后，列表确实切换
2. 编辑已有日程、点击 `新建一条` 后表单重置
3. 无类目时显示 `未分类`
4. 无开始时间时显示 `未设时间`
5. 类目停用后再恢复的分支
6. 类目新增未填写排序时按 `0` 提交
7. 日程保存或类目保存失败时的错误提示

### 4.2 TodoWorkspace

补测试覆盖以下行为：

1. `open / completed` 视图切换后，列表确实切换
2. 编辑已有待办、点击 `新建一条` 后表单重置
3. 无类目时显示 `未分类`
4. 无截止日期时显示 `未设日期`
5. 类目停用后再恢复的分支
6. 类目新增未填写排序时按 `0` 提交
7. 待办保存或类目保存失败时的错误提示

## 5. 验收标准

1. 新增测试全部通过
2. `npm.cmd run test:frontend` 通过
3. `npm.cmd run test:frontend:coverage` 通过
4. `ScheduleWorkspace.vue` 与 `TodoWorkspace.vue` 覆盖率相较任务前有可见提升
5. 更新 `8.5` 阶段验收文档中的测试结果与覆盖率记录

## 6. 备注

本任务目标是继续压缩 `8.5` 缺口。若完成后前端总体覆盖率仍未到 `95%+`，则必须继续拆下一份 task，优先处理 `LedgerWorkspace.vue`、`ChatHistory.vue`、`App.vue` 等剩余热点。
