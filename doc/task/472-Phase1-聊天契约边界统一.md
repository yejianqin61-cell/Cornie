# 472 Phase 1 聊天契约边界统一

## 1. Where this task sits

- **Phase 1 一条真实聊天链能走完**：目标是发送、流式显示、历史重载和确认动作都可完成。
- 本任务落实 **R-1 建立唯一的前后端契约与真实契约测试**，统一聊天数据的前端边界。
- 开始前需要任务 471 的失败契约；完成后，R-2 聊天流可使用稳定消息模型。

## 2. What the developer needs to know

**Read first**

- `src/renderer/api/chatlog.js` — 哪些错误路径和字段需要映射。
- `src/renderer/api/client.js` — 错误响应如何被转换与抛出。
- `src/renderer/components/chat/ChatHistoryPage.vue` — 历史页消费日期与分页的形状。
- `src/renderer/components/chat/MessageRow.vue` — 行组件现在使用哪种消息角色和正文。
- `electron/backend/chatlog/routes.js` — 服务端已经承诺的列表、单日和错误形状。

**Settled**

- 前端只面对 `user`、`assistant`、`system`；后端 `cornie` 在适配层映射为 `assistant`。
- 前端消息正文统一为 `text`；后端 `content` 在适配层映射。
- 日期列表使用 `/api/chatlogs` 的 `entries`，保留服务端 `pagination`。
- 所有 API 错误通过 `client.js` 的同一错误路径返回。

**Edges and seam**

- 接缝是 `api/chatlog.js` 到聊天组件的数据模型。
- 不改变数据库字段、聊天日期时区规则或服务端路由名称。

**Run**

- `node tests/services/phase1-chat-contract.test.mjs`
- `npx vitest run src/renderer/api/api.test.js src/renderer/components/chat/chat.test.js --maxWorkers=1`
- `npm run build`（仓库未提供独立 typecheck 脚本）。

**Unknowns**

- 若历史页同时需要 `matchedPreview`，保留它作为展示元数据，不把它当正文。
- 若分页 UI 没有消费 cursor，保持透传，不能杜撰加载更多交互。

## 3. The workflow

1. 阅读第 2 部分，复述：在 API 适配层一次完成聊天边界翻译。
2. 运行任务 471 的测试，确认路径和字段断言先失败。
3. 为日期列表、单日记录和消息模型添加最小转换，产出统一前端对象。
4. 为成功与错误响应补充 API 断言，产出可读的失败信息。
5. 调整现有行组件测试所用契约，产出 `cornie` 的助手展示证明。
6. 运行三个命令并提交边界统一意图。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 日期路径 | 请求历史列表 | 到达 `/api/chatlogs` | `listChatDays()` |
| 日期字段 | `entries` 响应 | 页面收到日期数组 | `ChatHistoryPage` |
| 正文映射 | `content: 你好` | 行收到 `text: 你好` | `getChatDay()` |
| 角色映射 | `role: cornie` | 行显示 Cornie | `MessageRow` |
| 失败响应 | 400 或 500 | 调用方收到 Error | `apiGet()` |
