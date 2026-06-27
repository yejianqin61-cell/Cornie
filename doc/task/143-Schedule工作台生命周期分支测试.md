# 143 Schedule 工作台生命周期分支测试

## 1. 任务目标

补齐 `ScheduleWorkspace.vue` 的高价值生命周期分支测试，覆盖取消、恢复、删除、类目排序与类目启停等关键交互。

## 2. 任务来源

- `doc/task/141-工作台剩余高价值交互分支测试.md`
- `coverage/frontend/coverage-summary.json`

## 3. 前置依赖

- `141` 已进入工作台分支补测阶段

## 4. 涉及范围

- `src/renderer/components/ScheduleWorkspace.vue`
- `tests/frontend/schedule-workspace-async.test.mjs`

## 5. 当前问题

当前 `ScheduleWorkspace` 仅覆盖：

- 列表加载
- 新建日程
- 列表加载失败

仍缺：

- 取消 / 恢复日程
- 删除日程
- 类目新增 / 排序 / 启停
- 视图切换

## 6. 目标设计

- 扩展现有测试 mock
- 追加生命周期交互用例
- 覆盖关键成功路径与状态切换

## 7. 实现步骤

### Step 1

扩展 schedule mock，支持取消 / 恢复 / 删除 / 类目操作。

### Step 2

补生命周期用例。

### Step 3

跑对应前端测试并提交。

## 8. 测试点

- 取消后状态变化
- 恢复后状态变化
- 删除后列表变化
- 类目排序与停用可见

## 9. 完成标准

- `ScheduleWorkspace` 主要生命周期路径进入回归

## 10. 交付物

- 更新后的 schedule 工作台测试

---

**文档结束**
