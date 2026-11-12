# task-046b 提醒调度核心

## 1. Where this task sits

- **Phase 6 不打开主窗口也照顾得到主人**，目标是主窗口关着时精灵会按时提醒，第二天打开就有铃湾写好的日记，主人能一键导出全部本地数据。
- **本任务推进 R-18 待办和日程到点提醒**：先做不依赖 Electron 的调度核心，决定"哪些该提醒、提醒过的不重复"。
- **Starts after**：task-046a 数据变更广播与精灵的待办数量。**Waits on**：task-046c 提醒接入桌面。

## 2. What the developer needs to know

**Read first**

- `electron/db.js` — 迁移数组（`migrations`，最后一项是 v8 `request_id`）、`getMeta`/`setMeta`/`getAppSetting`/`setAppSetting`、`listScheduleEntries`（`status: 'scheduled'`、`startAt`）、`listTodoEntries`（`status: 'pending'` 为未完成，`dueAt` 可空）。
- `electron/backend/schedule/service.js` 与 `todo/service.js` — 状态取值：日程 `scheduled`/`cancelled`，待办 `pending`/`done`。
- `src/renderer/components/schedule/ScheduleList.vue` — 日程的 `startAt` 是 `datetime-local` 的无时区字符串（如 `2026-09-16T10:00`），列表用 `new Date(startAt)` 解析。
- `tests/shared/service-harness.mjs` — 临时数据库怎么建。

**Settled**（产品决策已由主人确认，见 `doc/Cornie-040-审计后改进计划.md` Phase 6）

- 日程在开始前 **30 分钟**提醒一次，固定值，导出常量 `REMINDER_LEAD_MINUTES = 30`，不做配置项。待办在 `dueAt`（有则）到点时提醒一次，没有 `dueAt` 的待办不提醒。
- 错过的提醒**全部补发**：应用没开着期间到点的，下次运行时一起提醒；已经开始的日程、已经过期的待办也包括在内。
- 为了避免第一次运行就把历史数据全部提醒一遍，用"跟踪起点"限定范围：第一次调度时把当前时间记为 `reminders.tracking_started_at`（写在 `meta` 表）；只有事件时间（日程 `startAt`、待办 `dueAt`）不早于该起点的才会提醒。
- 去重靠持久化：迁移 v9 新增表 `reminders_sent(key text primary key, sent_at integer not null)`；键为 `schedule:<id>:<startAt>` 或 `todo:<id>:<dueAt>`。日程改了时间后键变了，会再提醒一次。
- 一次到点的提醒超过 3 条时合并为一条通知（标题"错过了 N 条提醒"，正文为前 5 个标题用"、"连接）；不超过 3 条时逐条通知。合并的每一条仍分别记入 `reminders_sent`。
- 调度函数固定为 `runReminderTick({ store, now, notify })`：`now` 是 `Date`，`notify({ title, body })` 由调用方注入；返回 `{ delivered: number }`。时间解析用 `new Date(字符串)`，与列表一致。
- 已取消的日程、已完成的待办不提醒。

**Edges and seam**

- Seam：新模块 `electron/backend/reminders/scheduler.js` 的 `runReminderTick`，注入当前时间与通知函数，这是本阶段计划里唯一允许的新 seam（`doc/Cornie-040-审计后改进计划.md` R-18）。
- 新增 `scheduler.js`、`tests/services/reminders.test.mjs`；改 `db.js`（迁移 v9）。

**Run**

- `node tests/services/reminders.test.mjs`
- `node tests/services/business-services.test.mjs && node scripts/verify-phase5-atomic-persistence.mjs`
- `npm run lint`

**Unknowns**

- 日程的无时区时间依赖运行机器的时区（与列表的显示一致）。机器时区不是主人所在时区时，提醒会偏移；本任务不处理，只在收口简报里记录。
- 如果新增迁移让任何现有测试因为 `schema_version` 断言失败，停止并报告，不要改那些断言。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：到点提醒日程和待办，补发错过的，已提醒的不重复，历史数据不被提醒。
2. 先写 Case 1 至 Case 7 的红测试。
3. 在 `db.js` 加迁移 v9。
4. 实现 `scheduler.js`：跟踪起点、到点判定、去重、合并通知。
5. 运行第 2 部分的三条命令。
6. 提交：`feat(reminders): decide which schedules and todos are due and never repeat them`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 日程 10:30 开始，`now` 为 10:00（此前已跑过一次起点 tick） | 通知 1 条，正文含该日程标题；`now` 为 09:59 时没有通知 | `runReminderTick` |
| 2 | 同一日程在 10:00 与 10:05 各跑一次 | 第二次没有通知；`delivered` 为 0 | `runReminderTick` |
| 3 | 已取消的日程、已完成的待办、没有 `dueAt` 的待办 | 都不提醒 | `runReminderTick` |
| 4 | 第一次运行（无起点）：一条昨天开始的日程，一条一小时后开始的日程 | 只记起点，昨天的那条永不提醒；那条未来的日程在其到点时提醒 | `runReminderTick` |
| 5 | 起点之后应用关闭 3 小时，其间 2 条日程和 1 条待办到点；之后再跑一次 | 逐条通知共 3 条；之后再跑为 0 | `runReminderTick` |
| 6 | 同样情形但有 5 条到点 | 只发 1 条合并通知，标题 `错过了 5 条提醒`；5 条都已记为已发送 | `runReminderTick` |
| 7 | 已提醒的日程把 `startAt` 改成更晚的时间 | 新时间的提前 30 分钟到点时再提醒一次 | `runReminderTick` |

时间点、条数和标题文字都是测试里写死的字面量（用 `new Date('2026-09-16T10:00')` 这样的本地时间构造，避免依赖时区）；30 分钟与"超过 3 条合并"来自第 2 部分的决策。
