# task-036g 消息正文排版

## 1. Where this task sits

- **批次 B 对话阅读与交互收口**，目标是让聊天页像工作台：可读、可导航、可恢复。
- **本任务移动 P-7 ← D-7 多行正文折叠**：正文保换行，代码块、列表、粗体按最小子集渲染。
- **Starts after**：B-1 token。**Waits on it**：B-6 失败态复用同一正文组件。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/MessageRow.vue` — 正文插值方式与样式。
- `src/renderer/api/chatlog.js` — 消息正文来自 `content`，可能含换行与代码围栏。
- `src/renderer/components/pet/CornieBubble.vue` — 现有气泡是否已有同类渲染，可复用则复用。
- `doc/Cornie-036-对话模块前端审计报告.md` 的 D-7 — 换行被折叠的运行证据。

**Settled**

- 不引入 markdown 依赖，写最小解析器。
- 禁止 `v-html`；一律用 Vue 节点渲染。
- 解析失败时退回纯文本，不丢内容。

**Edges and seam**

- 触及 `MessageRow.vue`、新建 `MessageBody.vue`。
- 缝：`MessageBody` 的 `text` prop；不改 API。

**Run**

- `npx vitest run src/renderer/components/chat`
- `npx eslint src/renderer/components/chat`

**Unknowns**

- 代码围栏未闭合时如何收尾。若测试数据无法定义期望，停止并报告。

## 3. The workflow

1. 读文件并复述任务。
2. 先写红测试：两段文本渲染成两个段落节点。
3. 实现段落与换行，测试转绿。
4. 先写红测试：代码围栏渲染 `<pre>`、列表渲染 `<li>`、`**粗体**` 渲染 `<strong>`。
5. 实现最小解析器，测试转绿。
6. 用 `MessageBody` 替换 `MessageRow` 的纯文本插值，跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 两段用空行分隔 | 两个段落节点 | `MessageBody` |
| 2 | 单段内换行 | 保留换行文本 | `MessageBody` |
| 3 | 三反引号代码块 | 一个 `<pre>`，无围栏符号 | `MessageBody` |
| 4 | 两行 `- ` 列表 | 一个 `<ul>` 两个 `<li>` | `MessageBody` |
| 5 | `**重点**` | 一个 `<strong>` | `MessageBody` |
