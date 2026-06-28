# task-010 待办首页、详情编辑与类目管理页

## 目标

重构待办模块全部页面。重点是"安排生活"，不是"看系统怎么安排"。

## 背景

当前 `TodoWorkspace.vue` 承载了待办的全部 UI。需拆分为独立页面：首页、详情编辑、类目管理。

## 关联设计文档

- `Cornie-0628-前端能力边界与人类可见接口设计.md` §9.4
- `Cornie-0628-前端首页原型结构草案.md` §7
- `Cornie-0628-前端页面清单与树状入口图.md` §5.4, §8.4

## 影响文件

| 文件 | 操作 |
|---|---|
| `src/renderer/components/TodoHome.vue` | **新建** |
| `src/renderer/components/TodoDetail.vue` | **新建** |
| `src/renderer/components/TodoCategoryManage.vue` | **新建** |
| `src/renderer/components/TodoWorkspace.vue` | 删除（由上述拆分替代） |

## 变更规格

### TodoHome.vue — 待办首页

**首屏结构**（4 个区块）：

1. **今日待办摘要**
   - "还有 N 件待办" / "已完成 N 件"
   - 简单摘要，不做复杂统计
   - 背景使用 `var(--todo-tint)` 浅橙底

2. **快速新增**
   - 一行输入 + 新增按钮
   - 可选：类目快速选择

3. **待办列表**
   - 最重要的待办优先
   - 每条：标题、类目标签、截止日期（如有）
   - 点击切换完成状态（勾选框）
   - 点击进入详情编辑
   - 已完成项灰度

4. **类目入口**
   - 简洁入口按钮

**禁止**：复杂排序解释、AI 整理过程

### TodoDetail.vue — 待办详情/编辑页

- 标题、描述、类目、截止日期、状态
- 保存/完成/重开/删除 按钮
- 返回导航

### TodoCategoryManage.vue — 待办类目管理页

- 类目列表
- 新增/编辑/删除 类目
- 拖拽排序（可选，简单实现）
- 删除确认

**API**：复用现有 todo 相关 API（`listTodos`、`createTodo`、`updateTodo`、`completeTodo`、`reopenTodo`、`deleteTodo`、`listTodoCategories`、`createTodoCategory`、`updateTodoCategory`、`restoreTodoCategory`、`reorderTodoCategory`）

## 验收条件

1. 待办首页显示摘要 + 快速新增 + 待办列表
2. 可新增待办
3. 可切换完成状态
4. 可查看/编辑/删除待办
5. 可管理类目
6. 无 AI 过程暴露
7. 视觉使用 `var(--todo-tint)` 浅橙底调

## 依赖

- task-001（全局样式）
- task-002（导航壳层，mode='todo' 映射到 TodoHome）
