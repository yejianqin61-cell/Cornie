# task-045e 日程可编辑

## 1. Where this task sits

- **Phase 5 后端已有的能力都能在界面用上**，目标是主人能在界面上管理三域类目、编辑日程、搜索聊天，看到联想话语和关联记忆，不再需要通过对话绕路。
- **本任务推进 R-16 日程可编辑，聊天可按关键词搜索**的前半：日程列表加编辑入口，复用创建表单。
- **Starts after**：task-045d 观察详情展示关联记忆。**Waits on**：task-045f 聊天关键词搜索。

## 2. What the developer needs to know

**Read first**

- `electron/backend/schedule/routes.js` 的 `PUT /schedules/:id` — 已支持 `title`、`startAt`，其余字段（`location`、`description` 等）经 `...req.body` 透传到服务。
- `electron/backend/schedule/service.js` 的 `normalizeScheduleInput` — `location` 用 `hasOwn` 判断是否更新。
- `src/renderer/api/schedule.js` — `updateSchedule(id, body)` 已存在，页面从没调用。
- `src/renderer/components/schedule/ScheduleForm.vue`、`ScheduleList.vue`、`ScheduleHomePage.vue` — 创建表单（标题、`datetime-local` 时间）；`onCreate` 直接把输入框的值作为 `startAt` 传给接口；列表用新加坡时区格式化时间。
- `src/renderer/components/schedule/schedule.test.js` — 前端测试写法。

**Settled**

- 编辑沿用创建时的时间格式：`datetime-local` 的值（如 `2026-09-16T10:00`）直接作为 `startAt` 传入，不做时区换算。编辑时把已有 `startAt` 的前 16 个字符填进输入框。
- `ScheduleForm` 新增可选属性 `initial`（`{ title, startAt, location }`）：有值时为编辑模式，按钮文字"保存"，并多一个"地点"输入框，提交触发 `update`（载荷 `{ title, startAt, location }`）而不是 `create`；无值时行为与现在完全一致（不显示地点输入框）。
- `ScheduleList` 新增"编辑"按钮，事件 `edit`（载荷为整条日程）；已取消的日程不显示编辑。
- `ScheduleHomePage` 持有 `editing`（正在编辑的日程或空）；点击编辑后在列表上方显示编辑表单；保存调用 `updateSchedule(id, body)`，成功后清空 `editing` 并重新读取列表，失败显示在 `submitError`。
- 列表显示地点（有则显示在时间之后）。

**Edges and seam**

- Seam：`schedule.test.js`（`vi.mock('../../api/schedule.js')`，需把 `updateSchedule` 加进 mock）。不新增 seam。
- 改 `ScheduleForm.vue`、`ScheduleList.vue`、`ScheduleHomePage.vue` 和 `schedule.test.js`。

**Run**

- `npx vitest run src/renderer/components/schedule src/renderer/api`
- `node scripts/verify-task124-todo-schedule-human-routes.mjs`
- `npm run lint`

**Unknowns**

- 如果后端 `update` 在只传 `location` 时清空了其他字段，停止并报告，不要在前端补传所有字段来掩盖。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：日程列表能编辑标题、时间、地点，保存后列表更新。
2. 先写 Case 1 至 Case 6 的红测试。
3. 改 `ScheduleForm` 支持编辑模式。
4. 改 `ScheduleList` 加编辑按钮并显示地点。
5. 改 `ScheduleHomePage` 的编辑状态与保存。
6. 运行第 2 部分的三条命令。
7. 提交：`feat(schedule): edit a schedule's title, time and location`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 列表含一条 `scheduled` 和一条 `cancelled` 日程 | 只有 `scheduled` 的那条有编辑按钮 | `ScheduleList` |
| 2 | 点击编辑 | 触发 `edit`，载荷为该日程 | `ScheduleList` |
| 3 | `ScheduleForm` 收到 `initial: { title: '会议', startAt: '2026-09-16T10:00:00', location: '三楼' }` | 标题输入为 `会议`，时间输入为 `2026-09-16T10:00`，地点输入为 `三楼`，按钮为"保存" | `ScheduleForm` |
| 4 | 编辑模式下修改标题为 `周会` 并保存 | 触发 `update`，载荷含 `title: '周会'`、原时间和地点 | `ScheduleForm` |
| 5 | 页面里保存编辑 | 调用 `updateSchedule('1', { title: '周会', startAt, location })` 一次，随后重新读取列表，编辑表单消失 | `ScheduleHomePage` |
| 6 | `updateSchedule` 抛错"保存失败" | 页面显示"保存失败"，编辑表单保留 | `ScheduleHomePage` |
| 7 | 不带 `initial` 的表单 | 与现在一致：没有地点输入框，按钮为"添加" | `ScheduleForm` |

标题、时间、地点都是测试里写死的字面量；时间只取前 16 个字符是 `datetime-local` 输入框的格式约定。
