# task-036j 长对话滚动管理

## 1. Where this task sits

- **批次 B 对话阅读与交互收口**，目标是让聊天页像工作台：可读、可导航、可恢复。
- **本任务移动 P-6 ← D-6 无自动滚底**：加载与流式跟随底部、上滚后暂停、回到最新、按日期记忆位置。
- **Starts after**：B-2 正文、B-4 日期导航。**Waits on it**：B-6 状态闭环。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatHistoryPage.vue` — 滚动容器、`load()` 尾部的滚动、transient 渲染。
- `src/renderer/components/chat/ChatPanel.vue` — transientMessages 的写入时机。
- `src/renderer/components/chat/ChatDateNav.vue` — 选中胶囊的滚动入口。
- `doc/Cornie-036-对话模块前端审计报告.md` 的 D-6 — 100 条日停在顶部的运行证据。

**Settled**

- 加载完成后默认停底部；用户上滚后不强制拉回。
- “回到最新”只在离开底部时出现。
- 日期切换按日期记忆滚动位置，首次进入用底部。

**Edges and seam**

- 触及 `ChatHistoryPage.vue`、`ChatDateNav.vue`。
- 缝：滚动容器的 `scroll` 事件与 `transientMessages` 侦听；不改 API。

**Run**

- `npx vitest run src/renderer/components/chat`
- `npx eslint src/renderer/components/chat`

**Unknowns**

- jsdom 没有布局，滚动位置需用属性覆盖模拟。若无法稳定断言，改用可观察状态（按钮出现/消失）作为期望。

## 3. The workflow

1. 读文件并复述任务。
2. 先写红测试：底部状态下新增 transient 会滚到底。
3. 实现跟随底部，测试转绿。
4. 先写红测试：上滚后新增 transient 不拉回，且出现“回到最新”；点击后回底。
5. 实现上滚暂停与按钮，测试转绿。
6. 先写红测试：切日期恢复各自滚动位置。
7. 实现位置记忆，跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 位于底部，新增一条 transient | scrollTop 等于 scrollHeight | `ChatHistoryPage` |
| 2 | 上滚后新增 transient | scrollTop 不变，出现“回到最新” | `ChatHistoryPage` |
| 3 | 点击“回到最新” | scrollTop 等于 scrollHeight | `ChatHistoryPage` |
| 4 | 切换日期再切回 | 恢复该日期上次的 scrollTop | `ChatHistoryPage` |
