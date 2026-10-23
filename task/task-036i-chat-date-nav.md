# task-036i 日期导航产品化

## 1. Where this task sits

- **批次 B 对话阅读与交互收口**，目标是让聊天页像工作台：可读、可导航、可恢复。
- **本任务移动 P-9 ← D-9 日期导航不足**：标签带昨天与年份、回到今天、按月份过滤、选中项滚入视野。
- **Starts after**：B-1 token。**Waits on it**：B-6 日期切换状态的解释。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatPanel.vue` — `loadDays`、`selectedDate`、箭头处理。
- `src/renderer/components/chat/ChatDateNav.vue` — 胶囊与两个箭头。
- `electron/backend/chatlog/service.js:151-181` — `listDates` 已支持 `month` 与返回 `availableMonths`。
- `doc/Cornie-036-对话模块前端审计报告.md` 的 D-9 — 导航缺口的证据。

**Settled**

- 月份过滤使用后端已有参数，前端不自己筛。
- 过滤到非当月时不强行插入“今天”胶囊。
- “回到今天”只在有今天记录或当前不是今天时可见。

**Edges and seam**

- 触及 `api/chatlog.js`、`ChatPanel.vue`、`ChatDateNav.vue`。
- 缝：`loadDays()` 与 `listChatDays({ month })`；不改后端。

**Run**

- `npx vitest run src/renderer/components/chat src/renderer/api`
- `npx eslint src/renderer/api src/renderer/components/chat`

**Unknowns**

- `availableMonths` 为空时如何呈现。若空数组导致布局异常，保留“全部”一项并停止扩展。

## 3. The workflow

1. 读文件并复述任务。
2. 先写红测试：今天/昨天/M月D日/跨年标签，以及月份过滤请求参数。
3. 实现标签与月份参数，测试转绿。
4. 先写红测试：点击“回到今天”恢复今天胶囊，选中项调用 `scrollIntoView`。
5. 实现回到今天与滚动联动，测试转绿。
6. 跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 今天、昨天、同年、跨年各一天 | 标签为今天/昨天/M月D日/Y年M月D日 | `loadDays()` |
| 2 | 选择 2026-09 月份 | `listChatDays` 收到 `{month:'2026-09'}` | `loadDays()` |
| 3 | 非当月过滤 | 不插入今天胶囊 | `loadDays()` |
| 4 | 选中年份较早的一天 | 点击“回到今天”后选中今天 | `ChatDateNav` |
| 5 | 选中项不在可视区 | 调用一次 `scrollIntoView` | `ChatDateNav` |
