# task-036b 对话默认打开今天并修正日期顺序

## 1. Where this task sits

- **批次 A 对话模块正确性收口**，目标是让首启、长日、失败、确认四条主路径在界面里可见可用。
- **本任务移动 P-2 ← D-2 默认打开最早一天**：进入对话默认今天，日期条按时间升序，箭头方向与日期先后一致。
- **Starts after**：A-5 原生按钮（箭头可点）。**Waits on it**：A-1 首启可见。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatPanel.vue` — `loadDays`、`selectedDate`、发送日期与 `prev/next` 处理。
- `src/renderer/components/chat/ChatDateNav.vue` — 胶囊顺序与箭头禁用。
- `electron/db.js:473-505` — 日期列表按 `date desc` 返回。
- `doc/Cornie-036-对话模块前端审计报告.md` 的 D-2、D-9 — 默认日期与箭头语义证据。

**Settled**

- 服务端保持倒序返回，前端负责排序与默认选择。
- 今天没有记录也要出现在日期条里，并作为默认选中。
- 左箭头去更早、右箭头去更晚，端点禁用。

**Edges and seam**

- 触及 `ChatPanel.vue`、`ChatDateNav.vue`。
- 缝：`loadDays()` 产出的 `days` 与 `selectedDate`；不改后端。

**Run**

- `npx vitest run src/renderer/components/chat`
- `npx eslint src/renderer/components/chat`

**Unknowns**

- 测试里“今天”依赖 `singaporeDate()`；若跨午夜不稳定，在测试中 mock `shared/local-date.js`。

## 3. The workflow

1. 读文件并复述任务。
2. 先写红测试：日期列表倒序传入时，默认选中今天且 `days` 升序。
3. 改造 `loadDays`：升序、补今天、默认今天。
4. 先写红测试：左右箭头在端点 disabled，方向与日期先后一致。
5. 实现箭头语义与禁用态，测试转绿。
6. 跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 日期列表 `[今天, 昨天, 前天]` | 默认选中今天 | `loadDays()` |
| 2 | 同上 | `days` 顺序为前天→昨天→今天 | `loadDays()` |
| 3 | 日期列表没有今天 | 今天补进列表并默认选中 | `loadDays()` |
| 4 | 选中最早一天 | 左箭头 disabled | `ChatDateNav` |
| 5 | 选中今天 | 右箭头 disabled | `ChatDateNav` |
