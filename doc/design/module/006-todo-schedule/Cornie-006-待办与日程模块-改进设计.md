# Cornie 006 待办与日程模块改进设计

## 1. 模块目标

负责待办、日程及其类目的 AI 联动设计。

## 2. 模块范围

- 待办事项
- 待办类目
- 日程事项
- 日程类目
- 未完成项摘要
- 只读补查能力

## 3. 上下文策略

进入 prompt 的内容：

- 未完成待办摘要
- 近期日程摘要
- 全部待办类目
- 全部日程类目

通过工具补查的内容：

- 完整待办列表
- 完整日程列表

## 4. 主要工具

- `todo.create`
- `todo.update`
- `todo.complete`
- `todo.delete`
- `todo.list_today`
- `todo_category.list`
- `todo_category.create`
- `schedule.create`
- `schedule.update`
- `schedule.cancel`
- `schedule.list_today`
- `schedule_category.list`
- `schedule_category.create`

---

**文档结束**
