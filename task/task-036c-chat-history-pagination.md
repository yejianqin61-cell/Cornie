# task-036c 单日历史分页与截断收口

## 1. Where this task sits

- **批次 A 对话模块正确性收口**，目标是让首启、长日、失败、确认四条主路径在界面里可见可用。
- **本任务移动 P-3 ← D-3 单日 100 条截断**：长日加载全部页并显示截断/更早的边界。
- **Starts after**：A-1 首启可见。**Waits on it**：A-4 确认与透明层。

## 2. What the developer needs to know

**Read first**

- `src/renderer/api/chatlog.js` — 目前只取 `messages`，丢掉分页字段。
- `electron/backend/chatlog/service.js:81-110` — 默认 100 条、`pagination.nextCursor/hasMore` 的形状。
- `src/renderer/components/chat/ChatHistoryPage.vue` — 加载与渲染位置。
- `doc/Cornie-036-对话模块前端审计报告.md` 的 D-3 — 120 条日只显示 100 条的运行证据。

**Settled**

- 分页由前端串行拉完，不改后端默认页大小。
- 首屏定位到最新一条，加载完成后滚到底部。
- 保留分页上限，防止异常数据拖死页面。

**Edges and seam**

- 触及 `api/chatlog.js`、`ChatHistoryPage.vue`。
- 缝：`getChatDay(date, { cursor, limit })` 的返回形状；不改后端。

**Run**

- `npx vitest run src/renderer/components/chat src/renderer/api`
- `npx eslint src/renderer/api src/renderer/components/chat`

**Unknowns**

- 后端 `nextCursor` 的累计偏移是否可与前端 `cursor` 直接串接。若形状与代码不一致，停止并报告。

## 3. The workflow

1. 读文件并复述任务。
2. 先写红测试：两页数据时组件并行/串行拉取并渲染全部消息。
3. 改造 `getChatDay` 透传 `cursor/limit`，返回 `pagination`。
4. 让 `load()` 串行取页、合并、滚到底部，测试转绿。
5. 先写红测试：分页上限触发时不再请求。
6. 跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 第 1 页 100 条且 `hasMore` | 以 `cursor=nextCursor` 请求第 2 页 | `load()` |
| 2 | 两页共 120 条 | 渲染 120 条，最后一条是第 120 条 | `ChatHistoryPage` |
| 3 | `hasMore=false` | 不再发请求 | `load()` |
| 4 | 超过分页上限 | 停止请求并保留已加载消息 | `load()` |
| 5 | 加载完成 | 滚动容器停在底部 | `ChatHistoryPage` |
