# task-036e 对话模块原生按钮语义恢复

## 1. Where this task sits

- **批次 A 对话模块正确性收口**，目标是让首启、长日、失败、确认四条主路径在界面里可见可用。
- **本任务移动 P-5 ← D-5 组件库 Button 渲染为 div**：对话模块的按钮恢复原生 `button` 语义。
- **Starts after**：无。**Waits on it**：A-1、A-4 都会用到按钮交互。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatPanel.vue` — 发送与取消如何绑定、`disabled` 期望什么行为。
- `src/renderer/components/chat/ChatDateNav.vue` — 两个箭头按钮的尺寸与 `variant/size` 用法。
- `src/renderer/components/chat/ConfirmCard.vue` — 确认/拒绝两枚按钮。
- `node_modules/neobrutalism-vue/components/button/index.ts` — 合法 variant/size 与基础类名。
- `doc/Cornie-036-对话模块前端审计报告.md` 的 D-5 — 运行时 div 证据与根因。

**Settled**

- 不改组件库安装包；在项目内建原生按钮封装。
- 视觉类名沿用 neobrutalism 的 CSS 类，避免引入新配色。
- 本次只替换对话模块，其余模块后续批量跟进。

**Edges and seam**

- 触及 `src/renderer/components/common/AppButton.vue`（新建）与 chat 目录 3 个组件。
- 缝：`AppButton` 组件的根元素；不改后端与 API。

**Run**

- `npx vitest run src/renderer/components/chat`
- `npx eslint src/renderer/components/chat src/renderer/components/common`

**Unknowns**

- 组件库 CSS 是否依赖 `:disabled` 伪类做视觉。若是，用属性选择器补一条样式。若类名失效，停止并报告。

## 3. The workflow

1. 读上述文件，用一句话复述任务。
2. 先写红测试：`AppButton` 渲染 `button`、`disabled` 时不可点击、点击仍冒泡。
3. 实现 `AppButton.vue`，失败测试转绿。
4. 替换 chat 三个组件的 Button，并给图标按钮加 `aria-label`。
5. 再写红测试：确认卡与日期箭头在 DOM 中是 `button`。
6. 跑 chat 测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 渲染 AppButton | 根元素是 `BUTTON` | `AppButton` |
| 2 | `disabled` 为 true | `button.disabled === true` | `AppButton` |
| 3 | 点击 AppButton | 父级收到 click | `AppButton` |
| 4 | 渲染 ConfirmCard | 两枚按钮是原生 `button` | `ConfirmCard` |
| 5 | 渲染 ChatDateNav | 两个箭头是原生 `button` | `ChatDateNav` |
