# task-046a 数据变更广播与精灵的待办数量

## 1. Where this task sits

- **Phase 6 不打开主窗口也照顾得到主人**，目标是主窗口关着时精灵会按时提醒，第二天打开就有铃湾写好的日记，主人能一键导出全部本地数据。
- **本任务推进 R-17 精灵窗口与主窗口数据联动**：主窗口写入数据后，精灵的待办数量更新。这是本阶段的 tracer bullet。
- **Starts after**：Phase 5 已收口。**Waits on**：task-046b 提醒调度核心；task-046d 用到本任务建立的订阅工具。

## 2. What the developer needs to know

**Read first**

- `electron/preload.cjs` 与 `electron/main.js` 的 `broadcastDataChanged` — 桥上已有 `broadcastDataChanged(detail)` 和 `onDataChanged(handler)`；主进程把事件转发给**另一个**窗口（发送方自己不收）。渲染层从来没有调用过它们。
- `src/renderer/api/client.js` 的 `request` — 所有非流式请求都经这里。
- `src/renderer/components/pet/CorneApp.vue` — 精灵页面独立于主窗口（`cornie.html`），现在不调用任何 API，气泡只轮播固定文案。
- `src/renderer/components/chat/ChatPanel.vue` 的完成回调 — 对话里工具写入发生在后端，主窗口渲染层只能从完成结果的 `toolExecution.results` 得知。
- `src/renderer/components/pet/pet.test.js`、`src/renderer/api/api.test.js` — 现有测试写法。

**Settled**

- 计划（`doc/Cornie-040-审计后改进计划.md` R-17）原写"主窗口订阅后刷新当前页"。已核实不需要：主窗口同一时刻只挂载一个模块（`App.vue` 用 `v-if` 切换），切换时页面会重新读取，所以不存在"同时打开着却过期"的业务页。本任务只做"主窗口 → 精灵"；"后台任务 → 主窗口"的刷新由 046d 用同一套工具实现。
- 新增 `src/renderer/data-sync.js`，导出三个函数：`domainOfPath(path)`、`notifyDataChanged({ domain })`、`onDataChanged(domains, handler)`（返回取消订阅函数）。没有桥（`window.cornieDesktop` 不存在）时都静默不做事。
- 域名映射固定：路径含 `/todos`、`/todo-categories` → `todo`；`/schedules`、`/schedule-categories` → `schedule`；`/ledger` → `ledger`；`/observations` → `observation`；`/entries` → `diary`；`/memory-wiki` → `memory`；`/confirmations` → `*`（确认后可能执行任意工具）；其余 → 不广播。`*` 表示所有订阅者都刷新。
- 请求层规则：`request` 在**非 GET 且响应成功**后调用 `notifyDataChanged`；失败和 GET 不广播；流式请求不经 `request`，不在这里处理。
- 对话工具写入：`ChatPanel` 完成回调里，若 `toolExecution.used` 为真，按每个结果的 `tool_name` 前缀广播：`ledger`→`ledger`，`todo`→`todo`，`schedule`→`schedule`，`observation`→`observation`，`memory_wiki`/`memory_index`/`memory_governance`→`memory`，其他→`*`。
- 精灵：右上角角标显示未完成待办数量（`data-testid="pet-todo-count"`，数量为 0 时不显示）；数据来自 `listTodos({ view: 'open' })` 的条数；订阅 `todo` 与 `*` 域的变更后重新读取，另外每 60 秒读取一次。读取失败时保留上一次的数字。

**Edges and seam**

- Seam：`api.test.js`（mock `fetch`）、`pet.test.js`（给 `window.cornieDesktop` 放一个假桥）、`ChatPanel.test.js`。不新增 seam。
- 新增 `data-sync.js` 及其测试；改 `client.js`、`CorneApp.vue`、`ChatPanel.vue`。

**Run**

- `npx vitest run src/renderer`
- `npm run lint`

**Unknowns**

- 精灵页面从 `file://`（打包后）或开发服务器加载；本地 API 的跨域白名单已含两者（`electron/server.js`）。如果精灵读取待办在打包后被浏览器拦截，停止并报告，不要放宽白名单。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：主窗口写入后广播变更，精灵据此刷新待办数量。
2. 先写 `data-sync.js` 的 Case 1 至 Case 3 红测试，再实现它。
3. 先写 Case 4 至 Case 6 的红测试，再改 `client.js`。
4. 先写 Case 7、Case 8 的红测试，再改 `CorneApp.vue`。
5. 先写 Case 9 的红测试，再改 `ChatPanel.vue`。
6. 运行第 2 部分的两条命令。
7. 提交：`feat(pet): keep the pet's todo count in sync with the main window`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `domainOfPath('/api/todo-categories/c1/reorder')`、`'/api/ledger/entries/expense'`、`'/api/settings/model'` | 分别为 `todo`、`ledger`、空 | `data-sync.js` |
| 2 | 没有 `window.cornieDesktop` 时调用 `notifyDataChanged`、`onDataChanged` | 不抛错 | `data-sync.js` |
| 3 | 假桥上订阅 `['todo']`，桥触发 `{ domain: 'schedule' }`，再触发 `{ domain: '*' }` | 第一次不回调，第二次回调一次；取消订阅后不再回调 | `data-sync.js` |
| 4 | `apiPost('/api/todos', body)` 成功 | 假桥收到 `{ domain: 'todo' }` | `client.js` |
| 5 | `apiGet('/api/todos')` 成功 | 假桥没有收到广播 | `client.js` |
| 6 | `apiPost` 返回 400 | 假桥没有收到广播 | `client.js` |
| 7 | 精灵挂载，`listTodos` 返回 3 条 | 角标显示 `3` | `CorneApp` |
| 8 | 假桥触发 `{ domain: 'todo' }`，`listTodos` 此后返回 4 条 | 角标变为 `4`；返回 0 条时角标消失 | `CorneApp` |
| 9 | 对话完成结果含 `ledger.create_entry` 与 `todo.create_entry` 两个工具结果 | 广播 `{ domain: 'ledger' }` 与 `{ domain: 'todo' }` 各一次 | `ChatPanel` |

域名与数量是测试里写死的字面量；映射表就是 Settled 里的对照。
