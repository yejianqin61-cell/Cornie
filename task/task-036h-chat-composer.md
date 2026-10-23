# task-036h 输入区包装与输入法保护

## 1. Where this task sits

- **批次 B 对话阅读与交互收口**，目标是让聊天页像工作台：可读、可导航、可恢复。
- **本任务移动 P-10 ← D-10 输入区未包装、中文回车误发送**：恢复边框与聚焦态、自动增高、字数提示、IME 守卫。
- **Starts after**：B-1 token。**Waits on it**：B-6 失败态的输入恢复。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatPanel.vue` — 输入区、发送中状态与 `handleSend`。
- `node_modules/neobrutalism-vue/components/textarea/Textarea.vue` — 库内 Textarea 的 props 与渲染标签（先确认它是否与 Button 一样退化为 div）。
- `electron/backend/conversation/routes.js:12,27` — 后端 `maxLen` 为 5000。
- `doc/Cornie-036-对话模块前端审计报告.md` 的 D-10 — IME 与裸 textarea 证据。

**Settled**

- 发送中只禁用发送，不禁用输入框。
- Enter 发送、Shift+Enter 换行；组合态不发送。
- 字数上限 5000，超过时阻止提交并提示。

**Edges and seam**

- 触及 `ChatPanel.vue`。
- 缝：`handleSend()` 与输入框的 `keydown/input` 处理；不改后端。

**Run**

- `npx vitest run src/renderer/components/chat`
- `npx eslint src/renderer/components/chat`

**Unknowns**

- 库内 Textarea 若渲染成 div，改用原生 textarea 加样式，不要等待修库。

## 3. The workflow

1. 读文件并复述任务。
2. 先写红测试：`isComposing` 的 Enter 不发送。
3. 加组合态守卫，测试转绿。
4. 先写红测试：Shift+Enter 不发送、Enter 发送；发送中 textarea 仍可编辑。
5. 改 keydown 与禁用逻辑，测试转绿。
6. 先写红测试：`maxlength=5000`、超限提示、自动增高样式。
7. 实现输入区样式与字数提示，跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 组合态 Enter | 不调用发送 | `handleSend()` |
| 2 | Shift+Enter | 不调用发送 | `handleSend()` |
| 3 | Enter | 调用发送 | `handleSend()` |
| 4 | 发送进行中 | textarea 仍可编辑 | `ChatPanel` |
| 5 | 输入超过 5000 字 | 出现超限提示且不发送 | `handleSend()` |
