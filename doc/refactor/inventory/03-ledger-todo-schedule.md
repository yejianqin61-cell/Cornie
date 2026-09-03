# Ledger / Todo / Schedule 模块重写规格

> 一次性重写为 React + TypeScript + Mantine 9 的前期规格盘点。
> 盘点范围：`src/renderer/components/{LedgerHome,LedgerCalendar,TodoHome,ScheduleHome,ScheduleCalendar}.vue`、
> `src/renderer/api/{ledger,todo,schedule}.js`、`src/renderer/utils/date.js`（被用到的部分）。
> 所有 API 路径与字段均从源码逐函数提取，未做推测；无法从前端观察到的响应字段已标注「未观察」。

---

## 1. 组件清单与职责

| 文件 | 行数 | 职责 | 依赖 |
| --- | --- | --- | --- |
| `components/LedgerHome.vue` | 1195（script≈475 / template≈260 / style≈460） | 记账主页：月度收支概览卡、月历（委托 LedgerCalendar）、筛选栏（日期×类型）、两张手写 SVG 图表（类目环形图 + 每日收支走势折线）、「记一笔」快速表单（含内联新建类目）、近期记录列表（默认 8 条，可展开全部）、类目管理入口按钮 | vue；`../api`（listLedgerEntries/listLedgerCategories/createExpenseEntry/createIncomeEntry/createExpenseCategory/createIncomeCategory）；`../syncSignals`；`../utils/date`（仅 `today()`）；`LedgerCalendar.vue`；`ui/UiButton.vue` |
| `components/LedgerCalendar.vue` | 170 | 纯展示月历：42 格 7 列网格、周一为首（一~日表头由父组件传入）、每格显示日号 + 收入/支出双圆点；状态类 isMuted/isToday/isSelected/hasExpense/hasIncome；只发事件不做业务 | 无（纯 props/emits） |
| `components/TodoHome.vue` | 455 | 待办主页：当前待办/已归档计数摘要卡、快速新增（标题+类目）、自制药丸 Tab（待办/已归档 + 计数）、条目列表（圆形 Checkbox、类目胶囊、dueAt、恢复/删除按钮） | vue；`../api`（listTodos/listTodoCategories/createTodo/completeTodo/reopenTodo/deleteTodo）；`../syncSignals`；`ui/UiButton.vue`；`ui/UiEmpty.vue` |
| `components/ScheduleHome.vue` | 505 | 日程主页：「今天 N 项安排」摘要卡、月历（委托 ScheduleCalendar）、工具栏（回到今天/清除筛选/新增安排）、新增表单（标题+起止时间+类目+地点）、日程列表（取消/恢复/删除） | vue；`../api`（listSchedules/listScheduleCategories/createSchedule/cancelSchedule/restoreSchedule/deleteSchedule）；`../syncSignals`；`ScheduleCalendar.vue`；`ui/UiButton.vue` |
| `components/ScheduleCalendar.vue` | 160 | 纯展示月历，与 LedgerCalendar 同构：42 格、hasEntries 单圆点（warning 色）、选中格反色 | 无（纯 props/emits） |
| `api/ledger.js` | 81 | 账目/账目类目域 API 客户端，12 个函数，全部走 `apiFetch` | `./shared.js` |
| `api/todo.js` | 81 | 待办/待办类目域 API 客户端，13 个函数 | `./shared.js` |
| `api/schedule.js` | 81 | 日程/日程类目域 API 客户端，13 个函数 | `./shared.js` |
| `utils/date.js` | 51 | 全仓统一日期工具：`DATE_RE`、`today()`（本地时区）、`formatDate()`、`parseLocalDate()`（拒绝滚动日期如 02-30）；模块头注释固化语义「今天 = 本地时区日期，禁止 toISOString 取日期键」 | 无 |

**基础设施依赖（这三个 Home 共用，重写时必须保留契约）：**

- `api/shared.js`：`API_BASE = 'http://127.0.0.1:5174/api'`；`apiFetch(path, init)` = 统一 JSON 请求入口，默认 30s 超时 + AbortSignal 透传，2xx 返回 `res.json()`、204 返回 `null`，错误抛 `ApiError`（`../request.js`，含结构化错误分类）。
- `api/index.js`：桶导出，业务组件统一 `from '../api'` 取函数，不直接 import 域文件（F-06 契约）。
- `syncSignals.js`：见 §2.6。

**utils/date.js 的实际使用情况（重要）：**

- `LedgerHome.vue` 只 import 了 `today()`（表单 occurredAt 默认值）。**TodoHome 与 ScheduleHome 完全没有使用 utils/date**——三者各自在组件内复制了 `pad2` / `formatLocalDateKey` / `toDateKey` / `getMonthRange`（LedgerHome 还多了 `toTimeMs`）。重写时应把这些本地复制品全部合并进 TS 版 date util。

---

## 2. 状态与交互流

### 2.1 日历如何选日（LedgerCalendar / ScheduleCalendar 同构）

两个日历都是**手写月历网格，无任何拖拽**，交互只有「点击选日」+「翻月」：

1. **网格生成**（在两个 Home 的 `calendarCells` computed 中）：取当月 1 号，`firstWeekday = (getDay() + 6) % 7` 换算为周一为首的偏移，从 `1 - firstWeekday` 日开始连推 **42 格（固定 6 行）**，每格 `{ date: 'YYYY-MM-DD', day, inMonth, ... }`。
   - Ledger 版每格额外带 `expense`/`income` 日汇总（从 monthEntries 按 `toDateKey` 聚合，UI 只用来画双点，不显示金额）。
   - Schedule 版每格 `hasEntries`（来自 `scheduleDates` Set，**只看 startAt 的日期键**）。
2. **选日**：`LedgerCalendar`/`ScheduleCalendar` 每格是 `<button @click="emit('select-date', cell.date)">`；父组件 `selectCalendarDate(date)` 做 **toggle**（再次点同一日取消选中 → `selectedDate = ''`）。无 range、无拖拽、无键盘导航。
3. **翻月**：日历头「上个月/下个月」按钮 → emit `prev-month`/`next-month` → 父组件 `moveMonth(±1)`：`currentMonth` 换为新月 1 号、**清空 selectedDate**、全量 `refresh()`。
4. **回到今天**：`jumpToToday()` 把 currentMonth 拨回本月并把 selectedDate 设为今天的本地日期键，再 refresh。
5. **状态类样式**：`isMuted`（非本月）、`isToday`（内描边 + 淡底）、`isSelected`（Ledger 用 success 软底、Schedule 用 accent 实底反白）。

> LedgerHome 的「选中日」是纯前端筛选：`visibleEntries = monthEntries` 再按 `toDateKey(occurredAt) === selectedDate` 过滤；`ScheduleHome` 的 `filteredSchedules` 同理。**选日不发任何请求。**

### 2.2 账目增删改查流（LedgerHome）

- **读**：`refresh()` 一次 `Promise.all([listLedgerEntries({}), listLedgerCategories({})])` —— **无参数全量拉取全部账目**（没有服务端月份过滤、没有分页）；月度汇总、月历格、图表、列表全部在客户端算。
  - `monthlyIncome`/`monthlyExpense` 是在 `refresh()` 里对全量数据逐条累加后写入的 ref（不是响应式 computed）。
  - 换月（moveMonth）、新建成功后都重新 `refresh()`（再拉全表）。
- **增（记一笔）**：折叠表单 `showForm`；字段 amount（input type=number step=0.01，字符串态）、type（expense/income）、item（备注）、occurredAt（`<input type="date">`，默认 `today()`）、categoryId（按 form.type 过滤后的类目下拉）。
  - 提交 `submitEntry()`：`saving` 防重入 → 按 type 选 `createIncomeEntry`/`createExpenseEntry`，body `{ amount: Number(form.amount), occurredAt: 'YYYY-MM-DD', categoryId|null, categoryName|null, item|null }`（categoryName 在提交前从 categories 反查同步）→ 成功后重置表单、关表单、全量 refresh。失败写 inline `errorMsg`。
  - type 切换有 watch：若当前 categoryId 类型不匹配则清空；`filteredCategories` 变化时自动回填 categoryName。
- **增（快速新建类目）**：内联盒子 `showQuickCategoryCreate`，输入框回车（`@keydown.enter.prevent`）或按钮提交 → `createExpenseCategory`/`createIncomeCategory({ name })` → refresh 后用 `result?.category ?? 本地按 name+type 再查一遍` 回填选中 → 关盒子。错误按服务端 message 关键词映射：`invalid category name`→「类目名不合适」；`similar`/`duplicate`→「类目已存在或太接近」；其余→「创建失败」。
- **删/改**：**本组件没有任何账目编辑或删除 UI**（`updateLedgerEntry`/`deleteLedgerEntry` 在全 renderer 无人调用）。
- **查（单条）**：`getLedgerEntry` 无人调用。

### 2.3 Todo 生命周期（TodoHome）

```
pending ──completeTodo──▶ done ──reopenTodo──▶ pending（done 条目进「已归档」Tab）
   │
   └──deleteTodo（前端 confirm() 原生弹窗确认）──▶ 移除
（status==='cancelled' 的条目在 refresh 时被 isVisibleTodo 过滤，前端整体不可见）
```

- **读**：`Promise.all([listTodos({}), listTodoCategories()])` 全量拉取，客户端按 status 二分：`activeTodos`（非 done）/`archivedTodos`（done），计数与 Tab 显示都来自这份内存数据。
- **增**：输入框回车或「新增」按钮 → `createTodo({ title, categoryId|null, categoryName|null, status: 'pending' })` → 清输入、切回 active Tab、refresh。
- **切状态**：条目上的自定义圆形 checkbox `@change=toggleTodo(t)` → done 则 `reopenTodo(id)`，否则 `completeTodo(id)`，成功后 refresh（无 in-flight 守卫）。
- **删**：`removeTodo(id)` → **原生 `confirm()`** 确认 → `deleteTodo(id)` → refresh。
- **无编辑 UI**：`updateTodo` 无人调用；dueAt 仅展示（`String(t.dueAt).slice(0, 10)`，无日期解析），新建时也不填 dueAt。

### 2.4 Schedule 生命周期（ScheduleHome）

```
active ──cancelSchedule──▶ cancelled ──restoreSchedule──▶ active
   │
   └──deleteSchedule（confirm() 确认）
```

- **读**：**带服务端月份过滤**：`listSchedules({ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' })`（注意：与 Ledger 不同，传纯日期而非 ISO 时间戳）+ `listScheduleCategories()`；`todayCount` = startAt 以今天日期字符串开头的条数。
- **增**：表单 title + startAt/endAt（`<input type="datetime-local">`，endAt 可空）+ 类目 + location → `createSchedule({ title, startAt, endAt|null, categoryId|null, categoryName|null, location|null, status: 'active' })` → 重置表单、关表单、refresh。前端校验仅「title 与 startAt 必填」。
- **切状态**：列表按钮 toggleStatus：cancelled→restore，否则 cancel，成功后 refresh。
- **删**：confirm() → deleteSchedule → refresh。
- **无编辑 UI**：`updateSchedule` 无人调用。
- **日历标记**：`scheduleDates` Set 只由 `startAt` 的日期键构成——跨天日程只标记起始日。

### 2.5 筛选流（两域通用）

- Ledger：`selectedDate`（日历点击，toggle）+ `typeFilter`（下拉：''/expense/income）→ 全部作用于内存数据；`currentFilterLabel` 生成「X年X月 / 这一天 × 只看收入」文案；「清除筛选」双清；「查看全部」切换列表截断（默认 slice 8 条）。
- Schedule：仅 `selectedDate` 过滤（对 startAt 日期键），「清除筛选」在未选日时 disabled。

### 2.6 同步信号（跨组件/跨窗口刷新）

- 机制（`syncSignals.js`）：
  - 全局唯一 CustomEvent：`'cornie:data-changed'`；
  - `emitDataChanged(detail)`：window 派发 + 调 `window.cornieDesktop.broadcastDataChanged(detail)`（Electron 跨窗口广播）；
  - `listenDataChanged(handler)`：首次调用时向 `window.cornieDesktop.onDataChanged` 订阅远端变更并转派发为同一事件（`remoteSyncBound` 单例防重复订阅）；返回取消订阅函数；
  - `collectChangedDomains(results)`：把工具执行结果按 `tool_name` 前缀（`ledger.*`/`ledger_category.*`、`todo.*`/`todo_category.*`、`schedule.*`/`schedule_category.*`、`observation.*`、`memory_*`）折叠成 `{ledger, todo, schedule, observation, memory}` 布尔域标记。
- **三个 Home 的消费模式完全一致**：`onMounted` → `refresh()` + `listenDataChanged((detail) => { if (detail?.ledger|todo|schedule) refresh() })`；`onBeforeUnmount` 取消订阅。**信号只触发「全量重拉」，无增量合并。**
- React 重写形态：`useSyncSignal(domain, callback)` 自定义 hook（useEffect 内订阅 + cleanup），事件名与 detail 形状保持不变（GUI/AI 侧也在用）。

---

## 3. API 契约清单

通用约定：全部经 `apiFetch`（`API_BASE = http://127.0.0.1:5174/api`），Content-Type application/json，默认 30s 超时；非 204 返回 JSON，204 返回 null；错误以 `ApiError.message` 抛出。所有 list 类响应均以 `.items` 数组消费。

### 3.1 Ledger 域（api/ledger.js，12 函数）

| 方法 | 路径 | 关键请求字段 | 关键响应字段 | 调用方 |
| --- | --- | --- | --- | --- |
| GET | `/ledger/entries?from&to&type&categoryId&categoryName&recent&ids` | query 全可选：`from`、`to`、`type`、`categoryId`、`categoryName`、`recent`（String() 化）、`ids`（数组逗号拼接） | `items[]`（组件使用 id/type/amount/occurredAt/item/categoryName；amount 为 number） | LedgerHome.refresh（**空参数全量调用**）；其余参数无调用方 |
| GET | `/ledger/entries/:id` | path id（encodeURIComponent） | 单条账目（未观察） | **无组件调用** |
| POST | `/ledger/entries/expense` | body：`amount`(number)、`occurredAt`('YYYY-MM-DD')、`categoryId|null`、`categoryName|null`、`item|null` | 未观察（组件不读返回值） | LedgerHome.submitEntry |
| POST | `/ledger/entries/income` | 同上 | 同上 | LedgerHome.submitEntry |
| PUT | `/ledger/entries/:id` | body payload（未观察字段） | 未观察 | **无组件调用** |
| DELETE | `/ledger/entries/:id` | path id | 未观察 | **无组件调用** |
| GET | `/ledger/categories?type` | query `type`（可选，未传=全部） | `items[]`（组件使用 id/name/type） | LedgerHome.refresh（空参数） |
| GET | `/ledger/categories/:id` | path id | 单条类目（未观察） | **无组件调用** |
| POST | `/ledger/categories/expense` | body `{ name }` | 组件读取 `result?.category`（回填选中） | LedgerHome.submitQuickCategoryCreate |
| POST | `/ledger/categories/income` | body `{ name }` | 同上 | LedgerHome.submitQuickCategoryCreate |
| PUT | `/ledger/categories/:id` | body payload（未观察字段） | 未观察 | **无组件调用** |
| POST | `/ledger/categories/:id/restore` | path id | 未观察 | **无组件调用** |

### 3.2 Todo 域（api/todo.js，13 函数）

| 方法 | 路径 | 关键请求字段 | 关键响应字段 | 调用方 |
| --- | --- | --- | --- | --- |
| GET | `/todos?view&from&to` | query 全可选：`view`、`from`、`to` | `items[]`（组件使用 id/title/status('pending'\|"done"\|"cancelled')/categoryName/dueAt） | TodoHome.refresh（**空参数全量**；view/from/to 无调用方） |
| GET | `/todos/:id` | path id | 单条待办（未观察） | **无组件调用** |
| POST | `/todos` | body：`title`、`categoryId\|null`、`categoryName\|null`、`status:'pending'` | 未观察（组件不读返回值） | TodoHome.addTodo |
| PUT | `/todos/:id` | body payload（未观察字段） | 未观察 | **无组件调用（编辑能力未建 UI）** |
| POST | `/todos/:id/complete` | path id，无 body | 未观察 | TodoHome.toggleTodo |
| POST | `/todos/:id/reopen` | path id，无 body | 未观察 | TodoHome.toggleTodo |
| DELETE | `/todos/:id` | path id | 未观察 | TodoHome.removeTodo |
| GET | `/todo-categories` | 无参数 | `items[]`（组件使用 id/name） | TodoHome.refresh |
| GET | `/todo-categories/:id` | path id | 单条类目（未观察） | **无组件调用** |
| POST | `/todo-categories` | body payload（未观察字段） | 未观察 | **无组件调用（前端无类目创建 UI）** |
| PUT | `/todo-categories/:id` | body payload（未观察字段） | 未观察 | **无组件调用** |
| POST | `/todo-categories/:id/restore` | path id | 未观察 | **无组件调用** |
| POST | `/todo-categories/:id/reorder` | body `{ sortOrder }` | 未观察 | **无组件调用** |

### 3.3 Schedule 域（api/schedule.js，13 函数）

| 方法 | 路径 | 关键请求字段 | 关键响应字段 | 调用方 |
| --- | --- | --- | --- | --- |
| GET | `/schedules?view&from&to` | query 可选：`view`、`from`、`to`（**ScheduleHome 传 'YYYY-MM-DD' 纯日期**，与 Ledger 的 ISO 时间戳不同） | `items[]`（组件使用 id/title/status('active'\|"cancelled')/startAt/endAt?/categoryName?/location?） | ScheduleHome.refresh（`{ from, to }` = 当月起止日） |
| GET | `/schedules/:id` | path id | 单条日程（未观察） | **无组件调用** |
| POST | `/schedules` | body：`title`、`startAt`('YYYY-MM-DDTHH:mm'，datetime-local)、`endAt\|null`、`categoryId\|null`、`categoryName\|null`、`location\|null`、`status:'active'` | 未观察（组件不读返回值） | ScheduleHome.addSchedule |
| PUT | `/schedules/:id` | body payload（未观察字段） | 未观察 | **无组件调用（编辑能力未建 UI）** |
| POST | `/schedules/:id/cancel` | path id，无 body | 未观察 | ScheduleHome.toggleStatus |
| POST | `/schedules/:id/restore` | path id，无 body | 未观察 | ScheduleHome.toggleStatus |
| DELETE | `/schedules/:id` | path id | 未观察 | ScheduleHome.removeSchedule |
| GET | `/schedule-categories` | 无参数 | `items[]`（组件使用 id/name） | ScheduleHome.refresh |
| GET | `/schedule-categories/:id` | path id | 单条类目（未观察） | **无组件调用** |
| POST | `/schedule-categories` | body payload（未观察字段） | 未观察 | **无组件调用** |
| PUT | `/schedule-categories/:id` | body payload（未观察字段） | 未观察 | **无组件调用** |
| POST | `/schedule-categories/:id/restore` | path id | 未观察 | **无组件调用** |
| POST | `/schedule-categories/:id/reorder` | body `{ sortOrder }` | 未观察 | **无组件调用** |

> 「无组件调用」均经全 renderer grep 核实（截至盘点时点）。这些函数是既有契约的一部分（可能供管理页/未来功能使用），重写 API 层时**保留全部签名**，不要按「当前被调用」裁剪。

---

## 4. UI → Mantine 9 组件映射表

参考：[Mantine 9.4 changelog（EmptyState / ResourcesSchedule）](https://mantine.dev/changelog/9-4-0/)、[MonthView](https://mantine.dev/schedule/month-view/)、[DayView](https://mantine.dev/schedule/day-view/)、[DatePicker（renderDay/firstDayOfWeek）](https://mantine.dev/dates/date-picker/)、[Calendar](https://mantine.dev/dates/calendar/)、[LineChart](https://mantine.dev/charts/line-chart/)、[DonutChart](https://mantine.dev/charts/donut-chart/)、[dates 入门（firstDayOfWeek 默认 1=周一）](https://mantine.dev/dates/getting-started/)。

### 4.1 两个手写月历的现状与覆盖评估（重点）

**现状**：`LedgerCalendar` 与 `ScheduleCalendar` 是两个几乎同构的**手写月历**——父组件用 `(getDay()+6)%7` 算周一偏移、固定生成 42 格（6 周）、CSS Grid 7 列渲染 `<button>` 单元格；交互仅 click 选日（toggle 在父组件）与上/下月按钮；格内附加信息只有 1~2 个装饰圆点（收入/支出 or 有日程）。**没有拖拽、没有 range、没有事件块。**

**@mantine/dates 的 `Month` / `Calendar` 能覆盖多少：约 80%**

- 网格、周一为首（`firstDayOfWeek` 默认 1 = Monday，恰好与现状一致）、out-of-month 淡化、today 高亮、selected 高亮、weekday 表头：全部内置。
- 上/下月导航：`Calendar`/`Month` 的 `onNextMonth`/`onPreviousMonth`/`onMonthChange` 可直接对接现有 `moveMonth`。
- 每格附加圆点：用 `getDateControlProps(date)` 打自定义 className，或 `renderDay(date)` 注入圆点（[DatePicker 文档](https://mantine.dev/dates/date-picker/) 明确 renderDay 可加 Indicator 等）。收入/支出双点 = renderDay 返回两个小圆点，可行。
- 差异点：现实现是 `<button>` 可聚焦单元格，Mantine 也有对应 control props，可达性基本持平；视觉（圆角 14px 格子、自定义 today 内描边）需在 `getDateControlProps`/styles 里定制，但不必自写网格。
- 结论：**月历网格应改用 `@mantine/dates` 的 `Month`（静态，选日走 `onChange`），不自写网格**；Ledger 与 Schedule 的差异（双点 vs 单点、选中色）用 props/定制解决，两个组件可合并成一个参数化组件。

**@mantine/schedule 能覆盖 Schedule 多少：**

- 现有 Schedule UI 是「月历点标记 + 平铺列表」，**不是时间网格**。`MonthView`（[文档](https://mantine.dev/schedule/month-view/)）面向事件块月历（`events` + `renderEvent` + `maxEventsPerDay` + "+more"），可以替代「点标记」甚至做得更丰富（每日显示事件条），但与现 UI 交互不同，属于**产品升级选项而非 1:1 等价物**。
- `DayView`/`WeekView`/`ResourcesDayView`/`ResourcesWeekView`（[DayView 文档](https://mantine.dev/schedule/day-view/)、[9.4 changelog](https://mantine.dev/changelog/9-4-0/)）提供时间槽网格、拖拽（`withEventsDragAndDrop` + `onEventDrop`）、事件缩放、当前时间指示线、`renderEvent`/`renderEventBody` 自定义。其数据模型 `ScheduleEventData { id, title, start, end, color, payload }` 与现有 `/schedules` 的 `startAt`/`endAt`/`location` 可以适配（location 放 `payload`）。**但现有 UI 没有时间网格视图，直接引入属于新增能力，不是迁移必需**。若产品确认要时间视图，`ResourcesSchedule` 包装组件（v9.4）可一站组合日/周/月视图。
- 结论：迁移期用 `Month`（点标记）保真；`@mantine/schedule` 的时间视图列为增强项单独评审。

### 4.2 通用映射表

| 现状（Vue 实现） | Mantine 9 替代 | 备注 |
| --- | --- | --- |
| `ui/UiButton.vue`（default/ghost/outline/dangerGhost，size sm） | `@mantine/core` `Button` | default→`variant="default"`；ghost→`variant="subtle"`；outline→`variant="outline"`；dangerGhost→`variant="subtle" color="red"`；sm→`size="xs"` |
| `.card` 容器（自绘圆角/边框/底色） | `Paper`（或 `Card`） | 三域各有 tint 底色（--ledger-tint 等），经 CSS vars→Mantine theme/CSS variables 映射 |
| 金额输入 `<input type="number" step="0.01">` | `NumberInput` | `decimalScale={2}`、`min={0}`、`hideControls`、`thousandSeparator`、`prefix="¥"`；**见 §6 金额精度** |
| 金额展示 `¥x.toFixed(2)`、tabular-nums | 保留自写 `formatCurrency(value)`（或 `Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY'})`）+ `Text` | Mantine 无金额格式化组件；NumberInput 的 valueFormat 只管输入框 |
| 文本输入（item/title/location/待办标题） | `TextInput` | |
| 类目/类型 `<select>` | `Select` | |
| `<input type="date">`（occurredAt） | `@mantine/dates` `DateInput` 或 `DatePickerInput` | 需 dayjs；值保持 'YYYY-MM-DD' 字符串契约 |
| `<input type="datetime-local">`（startAt/endAt） | `@mantine/dates` `DateTimePicker` | 值需保持与后端契约一致（'YYYY-MM-DDTHH:mm'） |
| 内联错误盒 `.lquickError/.terr/.serr/.lquickCategoryError` | `Alert color="red" variant="light"`；跨组件提示可加 `@mantine/notifications` | 现状所有错误都只写 inline 文本，无全局提示 |
| 表单状态/校验（手写 ref + disabled 条件） | `@mantine/form`（useForm）+ `Button disabled`/`loading` | title/startAt 必填、金额>0、endAt>startAt 等规则补进 schema |
| 手写 SVG 环形图（类目支出分布） | `@mantine/charts` `DonutChart`（依赖 recharts，需引 charts styles.css） | 图例用 `withLegend`；现「色点+名称+金额」自绘图例可保留自写以保真 |
| 手写 SVG 折线图（每日收支走势，含 Y 轴 tick 缩写、三档 X 轴标注、图例） | `@mantine/charts` `LineChart` | series=[支出,收入]，`dataKey="date"`，`yAxisProps/xAxisProps`、自定义 tooltip；`formatCurrencyTick` 的 k 缩写逻辑无对应 API，需自写 tickFormatter |
| 列表空态文本 `.lchartEmpty/.lrecentEmpty/.sempty` | `EmptyState`（v9.4+，`EmptyState.Indicator/Title/Description/Actions`） | TodoHome 已有 `UiEmpty`（icon+text）可直接换成 EmptyState |
| 加载（`loading` 布尔，仅抑制空态显示，无视觉反馈） | `LoadingOverlay`（卡片级）或 `Skeleton` | 现状完全没有加载指示，重写属补齐 |
| 原生 `confirm()`（Todo/Schedule 删除） | `Modal` 封装的确认对话框（自写 `ConfirmDialog`） | Electron 下原生 confirm 体验差且行为依赖版本，必须替换 |
| Todo 药丸 Tab（待办/已归档 + 计数徽标） | `SegmentedControl`（label 内嵌计数）或 `Tabs` | 计数徽标可用 `Badge`（round）拼进 label |
| 自绘圆形 Checkbox（checked=实心绿圈） | `Checkbox radius="xl"`（自定义 checked 图形可用 `icon` prop） | |
| Todo 条目行（标题+类目胶囊+日期+操作） | 列表容器：`Paper`/`Card` 栈 或 `Table`；操作区 `Group` + `Button` | 现为 grid 三列行卡，非表格语义；建议 Paper 栈 + Menu（如需收纳操作） |
| Schedule 条目行（时间+标题+类目胶囊+地点 + hover 显操作） | 同上；hover 显隐可用 CSS 或 `Menu` | |
| 类目下拉 + 「新建类目」内联盒 | `Select` + 内联 `Paper`（TextInput+Group[Button]）组合，见 §5 | 无现成 Mantine 组件 |
| 摘要卡（收支三项/待办计数/今天安排数） | `Paper` + `SimpleGrid`/`Divider` + `Text`（数字用 tabular-nums） | |
| 筛选栏（当前筛选文案 + 回到今天/清除筛选） | `Group` + `Text` + `Button` | |
| 竖向滚动容器 + 细滚动条 | 容器布局自持；`ScrollArea` 可选 | |
| 错误/成功通知（目前只有 inline） | `@mantine/notifications`（`notifications.show`） | 建议增删改成功也给轻提示 |
| `@mantine/hooks` 可接管的手写逻辑 | `useToggle`(showForm)、`useLocalStorage`(如需)、`useMediaQuery`(替代 @media 手写断点) | |

### 4.3 包清单

- `@mantine/core`：Paper/Card、Button、TextInput、NumberInput、Select、Checkbox、SegmentedControl/Tabs、Modal、Alert、EmptyState、Skeleton、LoadingOverlay、Group/SimpleGrid/Stack/Divider、Text。
- `@mantine/dates`（+dayjs）：Month（静态月历）、DateInput/DatePickerInput、DateTimePicker。
- `@mantine/schedule`：**增强项**——DayView/WeekView/ResourcesDayView/ResourcesWeekView/MonthView/ResourcesSchedule。
- `@mantine/notifications`：全局轻提示。
- `@mantine/form`：三处表单（记一笔、待办、日程）。
- `@mantine/charts`（+recharts）：DonutChart、LineChart。
- `@mantine/hooks`：useToggle/useMediaQuery 等。

---

## 5. 必须自写的部分

1. **月历格内容定制层**：收入/支出双圆点（Ledger）、有日程圆点（Schedule）、今日/选中/越界样式。基于 `Month` 的 `renderDay` + `getDateControlProps` 组合实现；若视觉还原要求高于 renderDay 能力，再退回自写 42 格网格（保留 `getMonthRange`/周一偏移算法）。
2. **确认对话框**：原生 `confirm()` → 自写 `ConfirmDialog`（Modal + Promise 化 API），Todo/Schedule 删除共用。
3. **快速新建类目内联盒**：输入即建（回车提交、创建中禁用、错误文案映射 `invalid category name`/`similar`/`duplicate` → 中文）。纯组合组件，无 Mantine 现成物。
4. **金额/货币格式化工具**：`formatCurrencyTick`（k 缩写三档）、`formatShortDate`（M/D）、结余/列表的 `¥x.xx`。建议统一成一个 `format.ts` 并配整数分（见 §6）。
5. **日期工具 TS 化与去重**：移植 `utils/date.js`（DATE_RE/today/formatDate/parseLocalDate），**并把 LedgerHome/ScheduleHome 内复制的 pad2/formatLocalDateKey/getMonthRange/toDateKey/toTimeMs 全部收编**，消灭三处重复实现。
6. **同步信号 hook**：`useSyncSignal(domain, cb)`（useEffect 订阅/清理），保持 `cornie:data-changed` 事件名、detail 域布尔形状、`window.cornieDesktop` 桥（broadcastDataChanged/onDataChanged）不变。
7. **请求竞态治理**（现状缺失）：refresh 的请求序号/AbortController（快速换月、连续数据变更信号时防旧响应覆盖新数据）；toggle/删除操作加 in-flight 守卫。
8. **账目列表行卡**：类型胶囊 + 主信息 + 右对齐金额（收入/支出双色、tabular-nums）——组合组件，Mantine 无 1:1，但纯组装。
9. **趋势图图例/轴标题/最高波动提示**：LineChart 自带图例可覆盖一部分，轴标题与「本月最高单日波动」为自绘补充。

---

## 6. 边界与坑

1. **时区/跨月（最高风险）**
   - LedgerHome 存在**两套日期语义混用**：`toTimeMs` 把 'YYYY-MM-DD' 按 **UTC 零点/23:59:59.999Z** 解析做月份边界与排序比较，而日历格、日聚合、可见性过滤用的是 `formatLocalDateKey(new Date(value))`（**本地时区**取日期键）。在 UTC+8 下多数情况巧合一致；在 UTC− 时区，`new Date('YYYY-MM-DD')` 的本地日期键会**前移一天**，日历格与筛选会错位。后端 `occurredAt` 的返回格式（纯日期 vs ISO 带时间）在前端代码中**不可观察**，重写前必须与后端确认，然后统一走 utils/date 的 `parseLocalDate`/`formatDate` 单一语义（其模块注释已固化「今天=本地时区、禁用 toISOString 取日期键」）。
   - 两个域的「月份范围」语义不一致：Ledger 实际上**全量拉取后在客户端过滤**（`listLedgerEntries({})`），getMonthRange 只用于前端比对；Schedule 则把 `from`/`to`（纯日期）发给服务端过滤。重写时要么统一为服务端过滤（Ledger 需后端支持），要么明确保留并注明。
   - 42 格固定 6 周、周一为首是硬编码行为（首列永远周一、跨月日期淡显），迁移到 `Month` 时注意 `firstDayOfWeek=1` 与 outside 日期样式一致性。
   - `ScheduleCalendar` 的 `hasEntries` 只由 `startAt` 日期键驱动：跨天日程只标记起始日，结束日无标记——迁移时决定是否补齐。
   - TodoHome 的 dueAt 显示是 `String(t.dueAt).slice(0, 10)` 字符串截断，不是日期解析；若 dueAt 带 UTC 偏移会有跨日显示风险。
2. **金额精度**
   - 全链路浮点：输入字符串 → `Number(form.amount)` → 累加（月汇总/日趋势/类目占比/结余全是 `+=`）→ `toFixed(2)` 展示。0.1+0.2 类误差会在汇总位显现；`step="0.01"` 仅是 UI 提示，**可输入任意小数、负数、科学计数（`Number('1e3')` 有效）**，客户端无 min/上限校验。
   - 重写建议：NumberInput（`decimalScale=2, min=0, clampBehavior`）+ 统一「分」整数运算或 decimal 库做汇总，仅展示层 `toFixed(2)`；现状展示已依赖 tabular-nums 对齐。
3. **重复提交/竞态**
   - 有守卫：`saving`/`adding`/`creatingCategory` 禁用按钮。
   - 无守卫：TodoHome.toggleTodo、ScheduleHome.toggleStatus、两处 removeTodo/removeSchedule（confirm 后直接发）——快速双击会发出重复请求。
   - 换月 `moveMonth`/`jumpToToday` 每次全量 `refresh()` 且**无请求排序/AbortController**：快速连续换月时，后返回的旧月响应会覆盖新月数据（列表与日历错月）。Ledger 的全量 entries 拉取还叠加在每次数据变更信号上，重复刷新频繁。
   - 重写建议：请求序号或 AbortController 取消陈旧请求；mutation 期间禁用对应行操作；可选 SWR 式去重。
4. **空态与加载**
   - 现状「加载」只是一个布尔 ref 用于抑制空态文案，**没有任何骨架屏/overlay**；错误只写 inline 文本，成功操作无提示。
   - 重写用 LoadingOverlay/Skeleton 补齐，但注意保持「加载中不闪空态」的现有行为（`v-if="empty && !loading"` 语义）。
   - 类目创建失败的回填依赖 `result?.category` + 本地按 name 再查的兜底；若后端不返回 `category` 对象且同名类目在本次 refresh 后才可见，选中回填可能失败——迁移时保留兜底或改为依赖 refresh 后按 id 查找。
5. **契约保真清单（重写验收用）**
   - API_BASE、apiFetch 的 204→null、30s 超时、`ApiError.message` 语义不变；三个域 API 函数签名全保留（包括当前无调用方的 get/update/restore/reorder）。
   - 请求体字段逐字保留：`occurredAt`='YYYY-MM-DD'、`startAt`/`endAt`=datetime-local 字符串、`status` 显式随创建（'pending'/'active'）、`categoryName` 与 `categoryId` 双写冗余字段（后端契约依赖，勿单边删除）。
   - `cornie:data-changed` 事件名、detail 形状、`collectChangedDomains` 的工具名前缀映射不变（AI/GUI 侧共用）。
   - 周一为首、'YYYY-MM-DD' 日期键、`今天=本地时区` 三条日期语义不变。