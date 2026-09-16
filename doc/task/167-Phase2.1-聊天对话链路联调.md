# 167-Phase2.1-聊天对话链路联调

## 1. 任务目标

将聊天面板 `ChatPanel.vue` 与后端 API 完整打通，实现发送消息 → 获取响应 → 展示工具结果 → 确认卡片 的闭环。

## 2. 需要改造的组件

| 组件 | 路径 | 改动 |
|------|------|------|
| ChatPanel.vue | `src/renderer/components/chat/ChatPanel.vue` | 接入 `sendMessage` API，处理 loading/error/streaming |
| ChatHistoryPage.vue | `src/renderer/components/chat/ChatHistoryPage.vue` | 接入 `listChatDays` + `getChatDay` API |
| ChatDateNav.vue | `src/renderer/components/chat/ChatDateNav.vue` | 接收日期列表数据 |
| MessageRow.vue | `src/renderer/components/chat/MessageRow.vue` | 支持 tool_result 和 confirm_required 类型 |
| ToolResultPanel.vue | `src/renderer/components/chat/ToolResultPanel.vue` | 展示工具执行结果 |
| ConfirmCard.vue | `src/renderer/components/chat/ConfirmCard.vue` | 确认/拒绝按钮接入 confirm API |

## 3. API 对端

| 前端调用 | 后端端点 |
|----------|----------|
| `sendMessage(message)` | `POST /api/conversations` |
| `listChatDays()` | `GET /api/chatlog/days` |
| `getChatDay(date)` | `GET /api/chatlog/days/:date` |
| `confirmAction(confirmId, action)` | `POST /api/confirm/:id` |

## 4. 状态管理

每个组件需覆盖以下状态：

1. **Loading**: 数据加载中 → 显示骨架屏或加载指示器
2. **Empty**: 无数据 → 显示 EmptyState
3. **Error**: 请求失败 → 显示错误提示 + 重试按钮
4. **Normal**: 正常展示数据
5. **Streaming**: 消息流式返回中（ChatPanel 特殊状态）

## 5. 验收标准

- [ ] 能在聊天输入框输入文字并发送
- [ ] 消息发送后显示加载中状态
- [ ] 收到响应后显示 Cornie 回复
- [ ] 如果响应包含 tool_results，渲染 ToolResultPanel
- [ ] 如果响应包含 confirm_required，渲染 ConfirmCard
- [ ] 点击确认/拒绝按钮能正确处理
- [ ] 网络错误时显示错误提示和重试
- [ ] 历史消息能按日期加载
- [ ] 所有组件有对应的测试用例

## 6. 交付物

- [ ] ChatPanel.vue 改造
- [ ] ChatHistoryPage.vue 改造
- [ ] ChatDateNav.vue 改造
- [ ] MessageRow.vue 改造
- [ ] ToolResultPanel.vue 改造
- [ ] ConfirmCard.vue 改造
- [ ] chat.test.js 测试文件（覆盖所有状态）