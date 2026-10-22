# 482 Phase 2 新加坡本地日期语义

## 1. Where this task sits

- **Phase 2 日常业务都能真实落库**：目标是一个工作日的六类业务能保存并重载。
- 本任务统一新加坡本地日期，防止凌晨操作被写入前一天。
- 开始前需要确认所有日期入口；跨模块演示依赖同日数据落入同一天。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatPanel.vue` — 现有 UTC 取日的已知边界。
- `src/renderer/components/ledger/LedgerHomePage.vue` — 月份筛选如何从浏览器时间生成。
- `electron/backend/conversation/routes.js` — 服务端缺省日期如何生成。
- `electron/backend/todo/service.js` 与 `schedule/service.js` — 今日视图如何判定日期。
- `tests/services` — 当前可复用的日期服务测试模式。

**Settled**

- Demo 的本地日期语义固定为 `Asia/Singapore`。
- 前端和服务端缺省日期共用一个可测试的日期函数。
- 显式提交的 ISO 日期保持原样，不被重新解释。

**Edges and seam**

- 接缝是所有缺省日期的单一日期辅助函数。
- 不迁移已存数据，不实现用户时区偏好。

**Run**

- `node tests/services/phase2-local-date.test.mjs`
- `npx vitest run src/renderer/components/chat --maxWorkers=1`
- `npm run test:full`。

**Unknowns**

- 若浏览器与主进程不能共享同一实现，先定义相同输入输出并分别测试。
- 若某域使用完整时间戳，保留时间戳，只替换取日期逻辑。

## 3. The workflow

1. 阅读第 2 部分，复述：缺省日期在新加坡凌晨必须仍属于当地当天。
2. 写 00:30 与 23:30 新加坡时间的失败测试。
3. 收敛前后端缺省日期到同一语义，产出可注入时钟的辅助函数。
4. 复验聊天、待办和日程的今日路径。
5. 运行三个命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 凌晨 | `2026-10-22 00:30 +08` | `2026-10-22` | 本地日期函数 |
| 午夜前 | `2026-10-21 23:30 +08` | `2026-10-21` | 本地日期函数 |
| UTC 前日 | 同一瞬间 UTC | 仍为当地 22 日 | 聊天缺省日期 |
| 显式日期 | `2026-10-20` | 原样传递 | API 请求 |
| 今日视图 | 本地当天记录 | 被今日查询返回 | Todo/Schedule |
