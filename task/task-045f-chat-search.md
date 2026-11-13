# task-045f 聊天按关键词搜索

## 1. Where this task sits

- **Phase 5 后端已有的能力都能在界面用上**，目标是主人能在界面上管理三域类目、编辑日程、搜索聊天，看到联想话语和关联记忆，不再需要通过对话绕路。
- **本任务推进 R-16 日程可编辑，聊天可按关键词搜索**的后半：聊天页加搜索框，调用已有的片段搜索接口，点击命中跳到对应日期。
- **Starts after**：task-045e 日程可编辑。**Waits on**：task-045g 逐页对照路由清单与收口。

## 2. What the developer needs to know

**Read first**

- `electron/backend/chatlog/routes.js` 的 `GET /chatlogs/search/snippets` — 查询参数 `keyword`（也接受 `q`）、`month`、`scope`、`limit`、`cursor`；响应含 `items`（元素 `{ date, messageId, role, content, createdAt, matchedPreview }`）和 `pagination`。
- `src/renderer/api/chatlog.js` — 现有 `listChatDays`、`getChatDay`、`exportChatDay`，没有搜索函数。
- `src/renderer/components/chat/ChatPanel.vue` 与 `ChatDateNav.vue` — 日期导航、`selectedDate`、`loadDays`；跳到某天只需设置 `selectedDate`。
- `src/renderer/components/chat/ChatPanel.test.js` — 现有的日期导航测试写法。

**Settled**

- renderer API 新增 `searchChatSnippets({ keyword, month, limit })`，请求 `GET /api/chatlogs/search/snippets`，只携带有值的参数。
- `ChatDateNav` 新增搜索输入框（`aria-label="搜索聊天记录"`，占位文字"搜索聊天"）和一个"搜索"按钮；回车也触发；事件名 `search`（载荷关键词字符串，去掉首尾空白，空串不触发）。
- `ChatPanel` 处理 `search`：调用 `searchChatSnippets({ keyword, limit: 20 })`，在导航下方显示命中列表；每项显示日期和 `matchedPreview`；点击某项把 `selectedDate` 设为该项日期并关闭列表。
- 没有命中时显示"没有找到相关聊天记录"；失败时显示错误文字，不影响正常聊天。
- 本任务不做按月份筛选的搜索、分页加载更多、命中消息的高亮与滚动定位（只跳到对应日期）。

**Edges and seam**

- Seam：`ChatPanel.test.js`（mock `../../api/chatlog.js`，需把 `searchChatSnippets` 加进 mock）和 `api.test.js`。不新增 seam。
- 改 `api/chatlog.js`、`ChatDateNav.vue`、`ChatPanel.vue` 和这两个测试文件。

**Run**

- `npx vitest run src/renderer/components/chat src/renderer/api`
- `npm run lint`

**Unknowns**

- `ChatPanel` 的现有测试对 `ChatDateNav` 用了真实子组件；新增输入框不应破坏它们，如有测试因为多出输入框而失败，只调整选择器，不要删断言。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：聊天页能按关键词搜索，点击命中跳到对应日期。
2. 先写 Case 1 至 Case 6 的红测试。
3. 在 `api/chatlog.js` 加 `searchChatSnippets`。
4. 在 `ChatDateNav` 加搜索输入与事件。
5. 在 `ChatPanel` 处理搜索、显示结果、跳转。
6. 运行第 2 部分的两条命令。
7. 提交：`feat(chat): search chat history by keyword`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `searchChatSnippets({ keyword: '咖啡', limit: 20 })` | 请求路径含 `/api/chatlogs/search/snippets`，查询串含 `keyword=` 的编码与 `limit=20`，不含空参数 | `api.test.js` |
| 2 | 在搜索框输入 ` 咖啡 ` 并按回车 | `ChatDateNav` 触发 `search`，载荷为 `咖啡` | `ChatDateNav` |
| 3 | 搜索框为空时点"搜索" | 不触发 `search` | `ChatDateNav` |
| 4 | 接口返回两条命中（日期 `2026-10-20` 与 `2026-10-18`，`matchedPreview` 各一段） | 面板显示两条，含各自日期与预览文字 | `ChatPanel` |
| 5 | 点击日期为 `2026-10-18` 的那一条 | `selectedDate` 变为 `2026-10-18`，命中列表关闭 | `ChatPanel` |
| 6 | 接口返回空 `items` | 显示"没有找到相关聊天记录" | `ChatPanel` |
| 7 | 接口抛错"搜索失败" | 显示"搜索失败"，聊天输入仍可用 | `ChatPanel` |

日期、预览和错误文字是测试里写死的字面量。
