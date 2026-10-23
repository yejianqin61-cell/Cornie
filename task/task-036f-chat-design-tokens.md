# task-036f 设计 token 与聊天视觉基线

## 1. Where this task sits

- **批次 B 对话阅读与交互收口**，目标是让聊天页像工作台：可读、可导航、可恢复。
- **本任务移动 P-8 ← D-8 设计 token 全仓未定义**：建立 token，聊天页改用白卡片与统一单位。
- **Starts after**：无。**Waits on it**：B-2 至 B-5 的视觉改动。

## 2. What the developer needs to know

**Read first**

- `src/renderer/styles/main.css` — 当前只有 Tailwind 与组件库导入，没有 token 定义。
- `src/renderer/components/chat/ChatPanel.vue`、`ChatHistoryPage.vue`、`ChatDateNav.vue`、`MessageRow.vue` — 哪些样式引用 `var(--nb-*)`、哪里硬编码。
- `src/renderer/components/todo/TodoHomePage.vue` — 其它模块已经按 token 写的页面骨架。
- `doc/Cornie-036-对话模块前端审计报告.md` 的 D-8 — 162 处引用 / 0 处定义的证据。

**Settled**

- token 定义放 `main.css` 的 `:root`，名称沿用现有引用。
- 不改 `neobrutalism-vue` 包内 CSS。
- 聊天页统一 `--nb-border-width`、`--nb-shadow`、`--nb-radius`、字号 token。

**Edges and seam**

- 触及 `main.css` 与 chat 目录样式。
- 缝：`:root` 上的自定义属性；不改组件结构。

**Run**

- `npx vitest run src/renderer/styles src/renderer/components/chat`
- `npx eslint src/renderer/styles src/renderer/components/chat`

**Unknowns**

- 其它模块是否依赖某个 token 的具体色值。若定义后出现明显冲突，停止并报告，不要就地改别的模块。

## 3. The workflow

1. 读文件并复述任务。
2. 先写红测试：读取 `main.css`，断言 7 个 token 都有定义且非空。
3. 写 token 定义，测试转绿。
4. 先写红测试：聊天容器不再出现 `#f0f0f0`，日期条与底栏使用 token 变量。
5. 改 chat 三个文件的样式，测试转绿。
6. 跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 读取 `main.css` | 7 个 `--nb-*` token 均有非空定义 | `:root` |
| 2 | 读取 `ChatPanel.vue` | 不含 `#f0f0f0` | `ChatPanel` |
| 3 | 读取 `ChatDateNav.vue` | 边框使用 `var(--nb-border)` | `ChatDateNav` |
| 4 | 读取 `MessageRow.vue` | 气泡背景使用 token | `MessageRow` |
