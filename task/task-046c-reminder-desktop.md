# task-046c 提醒接入桌面通知与精灵气泡

## 1. Where this task sits

- **Phase 6 不打开主窗口也照顾得到主人**，目标是主窗口关着时精灵会按时提醒，第二天打开就有铃湾写好的日记，主人能一键导出全部本地数据。
- **本任务推进 R-18 待办和日程到点提醒**：让 046b 的调度核心在主进程里定时运行，到点弹系统通知并让精灵冒泡。
- **Starts after**：task-046b 提醒调度核心。**Waits on**：task-046d 自动日记（复用同一处主进程接线）。

## 2. What the developer needs to know

**Read first**

- `electron/main.js` — `startLocalApi` 之后创建窗口；`before-quit` 里关闭服务和数据库；`cornieWindow` 是精灵窗口。
- `electron/preload.cjs` — 桥的现有方法；新增订阅要走 `ipcRenderer.on` 并返回取消函数，写法同 `onDataChanged`。
- `electron/backend/reminders/scheduler.js` — 046b 的 `runReminderTick({ store, now, notify })`。
- `src/renderer/components/pet/CorneApp.vue` — `showBubble(text)`，气泡 4 秒后消失。
- `scripts/verify-task121-electron-startup-chain.mjs`、`tests/architecture/phase4-architecture-boundaries.test.mjs` — 对主进程结构的现有检查。

**Settled**

- 主进程接线放进可测试的模块 `electron/backend/reminders/desktop.js`，导出 `startDesktopReminders({ store, notify, sendToPet, intervalMs = 60000, now = () => new Date(), timers = { setInterval, clearInterval } })`，返回 `{ stop() }`。`main.js` 只负责传入真实依赖。
- 行为固定：启动时**立即跑一次** `runReminderTick`（这就是错过提醒的补发），之后每 `intervalMs` 跑一次；每条要发的通知同时调用 `notify` 和 `sendToPet`。单次 tick 抛错只记 `console.error`，不中断后续 tick。
- 真实依赖：`notify` 用 Electron 的 `Notification`（`Notification.isSupported()` 为假时跳过）；`sendToPet` 向精灵窗口发 IPC `cornie:reminder`，载荷 `{ title, body }`。
- 桥新增 `onReminder(handler)`（订阅 `cornie:reminder`，返回取消函数）。精灵收到后用气泡显示 `title：body`，显示 8 秒。
- `app.on('before-quit')` 里调用 `stop()`，在关闭数据库之前。
- 点击系统通知打开主窗口：本任务不做。

**Edges and seam**

- Seam：`startDesktopReminders`（注入定时器、通知、精灵发送、当前时间）；精灵气泡用 `pet.test.js` 的假桥。不新增 seam。
- 新增 `desktop.js` 与 `tests/services/reminders-desktop.test.mjs`；改 `main.js`、`preload.cjs`、`CorneApp.vue`、`pet.test.js`。

**Run**

- `node tests/services/reminders-desktop.test.mjs`
- `npx vitest run src/renderer/components/pet`
- `node scripts/verify-task121-electron-startup-chain.mjs`
- `npm run lint`

**Unknowns**

- `main.js` 无法在没有 Electron 的测试里运行；它的接线只能靠打包后的实机验证（046g）。如果 `verify-task121` 因为 `main.js` 的结构断言而变红，只允许调整断言来适配新增的一行启动调用，并停下来报告改了什么。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：主进程每分钟检查提醒，启动时补发，既弹系统通知也让精灵冒泡。
2. 先写 `desktop.js` 的 Case 1 至 Case 4 红测试，再实现它。
3. 先写精灵的 Case 5 红测试，再改 `CorneApp.vue` 和桥。
4. 在 `main.js` 里接线，并在退出时 `stop()`。
5. 运行第 2 部分的四条命令。
6. 提交：`feat(reminders): deliver due reminders as notifications and pet bubbles`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 启动一个注入假定时器的 `startDesktopReminders`，库里有一条已到点的日程 | 启动后立刻（不等定时器）`notify` 与 `sendToPet` 各被调用 1 次，内容相同 | `startDesktopReminders` |
| 2 | 手动触发假定时器 3 次 | 已提醒的日程不再重复；新到点的会提醒 | `startDesktopReminders` |
| 3 | `runReminderTick` 在某次 tick 抛错 | 记录错误，下一次 tick 照常运行 | `startDesktopReminders` |
| 4 | 调用返回的 `stop()` | 假定时器的 `clearInterval` 被调用 | `startDesktopReminders` |
| 5 | 精灵挂载，假桥触发 `onReminder` 回调 `{ title: '日程提醒', body: '周会' }` | 气泡文字为 `日程提醒：周会` | `CorneApp` |

内容文字与调用次数是测试里写死的字面量。
