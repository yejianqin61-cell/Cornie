# task-011 日程首页、详情编辑与类目管理页

## 目标

重构日程模块全部页面。重点是"接下来会发生什么"，让用户对自己生活安排有清晰感知。

## 背景

当前 `ScheduleWorkspace.vue` 承载了日程的全部 UI。需拆分为独立页面：首页、详情编辑、类目管理。

## 关联设计文档

- `Cornie-0628-前端能力边界与人类可见接口设计.md` §9.4
- `Cornie-0628-前端首页原型结构草案.md` §8
- `Cornie-0628-前端页面清单与树状入口图.md` §5.5, §8.5

## 影响文件

| 文件 | 操作 |
|---|---|
| `src/renderer/components/ScheduleHome.vue` | **新建** |
| `src/renderer/components/ScheduleDetail.vue` | **新建** |
| `src/renderer/components/ScheduleCategoryManage.vue` | **新建** |
| `src/renderer/components/ScheduleWorkspace.vue` | 删除（由上述拆分替代） |

## 变更规格

### ScheduleHome.vue — 日程首页

**首屏结构**（4 个区块）：

1. **今天与近期安排摘要**
   - 今天有几项安排
   - 最近一周概览
   - 简单摘要，不做复杂日历视图

2. **快速新增安排**
   - 标题 + 时间 + 保存按钮
   - 可选：类目、地点、结束时间

3. **最近日程列表**
   - 按时间排序
   - 每条：时间、标题、类目标签、状态
   - 点击进入详情
   - 已取消项灰度

4. **类目入口**
   - 简洁入口按钮

**禁止**：AI 整理过程、排序与重算过程

### ScheduleDetail.vue — 日程详情/编辑页

- 标题、描述、开始时间、结束时间、地点、类目、状态
- 保存/取消/恢复/删除 按钮
- 返回导航

### ScheduleCategoryManage.vue — 日程类目管理页

- 类目列表
- 新增/编辑/删除 类目
- 删除确认

**API**：复用现有 schedule 相关 API（`listSchedules`、`createSchedule`、`updateSchedule`、`cancelSchedule`、`restoreSchedule`、`deleteSchedule`、`listScheduleCategories`、`createScheduleCategory`、`updateScheduleCategory`、`restoreScheduleCategory`、`reorderScheduleCategory`）

## 验收条件

1. 日程首页显示摘要 + 快速新增 + 最近日程列表
2. 可新增/编辑/取消/删除日程
3. 可管理类目
4. 无 AI 过程暴露
5. 视觉符合新设计语言

## 依赖

- task-001（全局样式）
- task-002（导航壳层，mode='schedule' 映射到 ScheduleHome）
