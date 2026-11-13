# Cornie-045 后端能力接入界面收口简报

## 1. Headline

**本期：Phase 5 的界面与接口改动全部完成；`npm run test:full` 通过（前端 250 例）。在界面上走一遍这一项没有实机验证。另发现并修复了一个影响整个应用的输入框缺陷。**

基线：`doc/Cornie-040-审计后改进计划.md` 的 Phase 5（R-11、R-12、R-13、R-16）。

| # | Change | Where | Kind | State | What it means for the reader |
| --- | --- | --- | --- | --- | --- |
| I-1 | 共用类目管理组件，接进收支页；记录表单只收启用的类目 | `common/CategoryManager.vue`、`LedgerHomePage.vue` | New / Fixed | Done | 能新增、改名、停用、恢复收支类目；停用的类目不再出现在记账表单里 |
| I-2 | 待办与日程的类目管理、排序、创建时选类目、列表显示类目；列表接口支持 `includeInactive` | 两个页面、表单、列表、`*-categories` 路由 | New | Done | 这两个域的类目第一次在界面里可见、可管理、可恢复 |
| I-3 | 聊天渲染联想话语，工具结果按回复 ID 在会话内保留 | `ChatPanel.vue`、`ChatHistoryPage.vue`、`MessageRow.vue` | New | Done | 历史刷新后工具结果不再消失 |
| I-4 | 观察详情返回并展示关联记忆，点击跳到记忆页 | `observation/routes.js`、`memory-wiki/service.js`、`App.vue` | New | Done | 前端早就读 `memoryLinks`，后端补上了它 |
| I-5 | 日程可编辑标题、时间、地点 | `ScheduleForm.vue`、`ScheduleList.vue`、`ScheduleHomePage.vue` | New | Done | 日程不用删了重建 |
| I-6 | 聊天按关键词搜索，点击命中跳到对应日期 | `ChatDateNav.vue`、`ChatPanel.vue`、`api/chatlog.js` | New | Done | 能找到几个月前聊过的话 |
| I-7 | **输入框写回缺陷修复**：新增 `AppInput` | `common/AppInput.vue` 及三处使用 | Fixed | Done | 见第 2 节 |

Routine：8 个提交（含本简报）；前端测试由 197 例增至 250 例，另有 `category-routes` 后端测试 2 例、`observation-routes` 增 1 例。

## 2. What it means

### 2.1 一个比本期需求更重要的发现

`neobrutalism-vue` 的 `Input` 没有声明 `modelValue`，对它写 `v-model` 时，用户在输入框里打的字不会写回绑定的变量。受影响的有：待办创建框、日程创建框、观察搜索框，以及**模型设置里的 API Key、地址和模型名**。

之前的测试没发现，是因为测试用 `findComponent({ name: 'Input' }).setValue(...)`：测试库对组件包装器直接触发 `update:modelValue`，根本没有往输入框里打字。我已用探针确认：向原生输入框输入后，待办创建框不会发出 `create`。

修复是 `AppInput`：把 `v-model` 接到原生输入框，其余属性原样透传。相关测试改为向原生输入框打字；`ModelSettings` 新增的测试在没有修复时会失败（我临时还原该文件验证过）。

这个缺陷意味着：在修复之前，设置页的 API Key 从界面其实填不进去。它是否在真实应用里出现，我只做了组件级验证，没有启动应用复核，建议人工确认一次。

### 2.2 对照验收项

- R-11：三域都能新增、改名、停用、恢复类目；待办和日程能上移下移（按位置重新编号，因为新建类目的 `sortOrder` 全是 0，直接交换数值会无效）；新类目立即出现在创建表单的下拉里。
- R-12：联想话语显示在回复上方；工具结果和联想话语在历史刷新后、切换日期再切回后仍在。**只在本次应用会话内保留，不跨重启。**
- R-13：详情页展示引用这条观察的非归档记忆页；点击打开记忆页。
- R-16：日程可编辑；聊天可搜索并跳到日期。

### 2.3 逐页对照路由清单（task-045g）

后端共 96 个接口（含 `/api/health`、`/api/telemetry`、`/api/model/status`）。前端请求函数覆盖其中绝大部分；对照分两类。

**接口有前端函数，但没有任何组件使用：**

| 接口 | 前端函数 | 结论 |
| --- | --- | --- |
| `GET /ledger/entries/:id`、`GET /schedules/:id`、`GET /todos/:id` | `getEntry`、`getSchedule`、`getTodo` | 有意不做：列表已含全部字段，不需要单条读取 |
| `PUT /memory-wiki/pages/:pageId/status` | `updatePageStatus` | 有意不做：归档、恢复已覆盖界面需要的状态切换 |
| `GET /memory-wiki/topic-index/:key` 与 `.../source-trace` | `getTopic`、`getTopicSourceTrace` | 未做：主题只作为筛选标签，没有主题详情页 |
| `POST /conversations` | `sendMessage` | 有意不做：聊天用流式接口 |
| `GET /model/status` | `getModelStatus` | 未做：设置页没有"检测连通"按钮 |

**接口没有前端函数：**

| 接口 | 结论 |
| --- | --- |
| `GET /chatlogs/export/month/:month` | 未做：只有按日导出 |
| `GET /conversations/:date`、`DELETE /conversations/:date` | 有意不做：聊天页用 chatlog 接口读取；删除某日会话是破坏性操作，没有设计界面 |
| `GET /confirmations/:id` | 有意不做：列表已含确认卡所需字段 |
| `GET /ledger/categories/:id`、`GET /todo-categories/:id`、`GET /schedule-categories/:id` | 有意不做：类目列表已含全部字段 |
| `GET /observations/recall` | 有意不做：给模型工具用的召回入口，界面用列表接口的筛选 |
| `PUT /memory-wiki/pages/:pageId/summary`、`.../aliases`、`.../related-pages` | 未做：编辑器通过整页更新修改摘要；别名与关联页没有编辑入口 |
| `PUT /memory-wiki/topic-index/:key/aliases`、`POST .../link-page`、`POST /memory-wiki/pages/:pageId/link-topic` | 未做：没有主题管理界面 |
| `GET /telemetry` | 有意不做：运维查询 |

## 3. Still open

- **界面没有实机走查。** 与 Phase 4 同样的原因：前端测试是组件测试。除 2.1 提到的输入框外，类目管理浮层、编辑表单、搜索结果列表的样式和交互都没有在真实窗口里看过。
- `App.vue` 里"观察 → 记忆页"的跳转接线没有自动化测试；它前后两段（观察组件的事件转发、记忆页的 `focusPageId`）各有测试。
- 观察的关联记忆靠逐页读取页面文件反查，页面很多时会变慢，没有建反向索引。
- 聊天搜索只跳到对应日期，不高亮、不滚动到命中的那条消息，不支持按月份筛选和翻页。
- 日程编辑只能改标题、时间、地点，没有改类目、描述和结束时间的入口。
- 上面第 2.3 节列出的未做接口。
- `verify-task124-todo-schedule-human-routes` 单独运行会卡住不退出，在本期开始前的提交上同样如此，不在门禁里，未处理。
