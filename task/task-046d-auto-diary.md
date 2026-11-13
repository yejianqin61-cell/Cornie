# task-046d 跨日自动生成 Cornie 日记

## 1. Where this task sits

- **Phase 6 不打开主窗口也照顾得到主人**，目标是主窗口关着时精灵会按时提醒，第二天打开就有铃湾写好的日记，主人能一键导出全部本地数据。
- **本任务推进 R-19 日记的 Cornie 部分每日自动生成**：默认关闭，设置里手动开启；开启后启动时和每小时补写缺失的日记。
- **Starts after**：task-046c 提醒接入桌面。**Waits on**：task-046e 数据导出核心。

## 2. What the developer needs to know

**Read first**

- `electron/backend/diary/service.js` — `generateCornie({ date })` 调用 `buildWikiContext(..., baseDir: process.cwd())`：**打包后 `process.cwd()` 是安装目录，不是数据目录**，所以日记读到的记忆是错的。本任务一并修复。
- `electron/server.js` — `diaryService(store)` 的创建处；`baseDir` 在这里可用。
- `electron/db.js` — `getAppSetting`/`setAppSetting`（存在 `meta` 表）、`getEntry(store, date)`（返回 `cornieText`）、`listConversationDates`（按日期统计聊天条数）。
- `electron/backend/settings/service.js` 与 `routes.js`、`src/renderer/api/settings.js`、`src/renderer/components/settings/SettingsPage.vue` — 现有的设置写法。
- `shared/local-date.js` 的 `singaporeDate` — 项目统一的"今天"。
- `src/renderer/data-sync.js` — 046a 建的订阅工具。

**Settled**（产品决策已由主人确认）

- **默认关闭。** 设置键固定为 `settings.diary.autoGenerate`，取值字符串 `true`/`false`，缺省视为 `false`。开启后会在主人不操作时调用模型，产生网络请求和费用，所以必须是显式开启。
- 设置服务新增 `getDiaryAutoSetting()`（返回 `{ enabled }`）与 `setDiaryAutoSetting(enabled)`；路由 `GET /settings/diary-auto`、`PUT /settings/diary-auto`（体 `{ enabled: boolean }`，非布尔返回 400）；renderer API `getDiaryAutoSetting()`、`saveDiaryAutoSetting(enabled)`；设置页新增一个小节，一个复选框，文字"自动生成 Cornie 日记（会调用模型）"。
- 核心模块 `electron/backend/diary/autoGenerate.js`，导出 `runAutoDiary({ store, today, generate, maxDays = 7, maxPerRun = 3 })`：若设置未开启返回 `{ generated: [], skipped: 'disabled' }`；否则在 `[today - maxDays, today)` 内找出"有聊天记录且 `cornieText` 为空"的日期，从最早的开始，每次最多生成 `maxPerRun` 篇；`today` 当天永远不生成。
- `generate({ date })` 由调用方注入（真实依赖是 `diaryService.generateCornie`）。某一篇抛错就**停止本次运行**并返回 `{ generated, error }`，已成功的保留，失败的不写入，下次运行再试。
- 主进程接线：`main.js` 在 API 启动后立即运行一次，之后每小时一次（与 046c 同一处接线）；每生成一篇，向主窗口广播 `{ domain: 'diary' }`；`DiaryHomePage` 订阅 `diary` 与 `*` 域并重新读取。
- 修复：`diaryService(store, { baseDir })` 用传入的 `baseDir` 替换 `process.cwd()`；`server.js` 传入。

**Edges and seam**

- Seam：`runAutoDiary`（注入 `generate`）；设置接口用真实 HTTP（新文件 `tests/services/diary-auto.test.mjs`，写法同 `memory-wiki-routes.test.mjs`）；设置页与日记页用前端测试。不新增 seam。
- 新增 `autoGenerate.js`、测试文件、设置小节组件；改 `settings/service.js`、`routes.js`、`diary/service.js`、`server.js`、`main.js`、`api/settings.js`、`SettingsPage.vue`、`DiaryHomePage.vue`。

**Run**

- `node tests/services/diary-auto.test.mjs`
- `node tests/services/diary-service.test.mjs`
- `npx vitest run src/renderer/components/settings src/renderer/components/diary`
- `npm run lint`

**Unknowns**

- 如果 `diary-service.test.mjs` 因为 `baseDir` 改动变红，说明某处仍依赖 `process.cwd()`；停止并报告，不要回退修复。
- 回溯 7 天和每次最多 3 篇是为了限制费用，是本任务定的默认值，不是主人给的数字，收口简报里要写明。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：默认关闭的自动日记，开启后补写最近缺失的日记，失败不写空内容，并顺手修复日记读错记忆目录的问题。
2. 先写设置接口的 Case 1、Case 2 红测试，再实现服务、路由、API。
3. 先写 `runAutoDiary` 的 Case 3 至 Case 8 红测试，再实现它。
4. 修复 `diaryService` 的 `baseDir`，运行 `diary-service.test.mjs`。
5. 先写设置页与日记页的 Case 9、Case 10 红测试，再改组件。
6. 在 `main.js` 接线（启动时与每小时），并广播 `diary` 变更。
7. 运行第 2 部分的四条命令。
8. 提交：`feat(diary): write missing Cornie diaries automatically when the owner opts in`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 全新数据库 `GET /settings/diary-auto`；`PUT { enabled: true }` 后再 `GET` | 先 `false`，后 `true` | 真实 HTTP |
| 2 | `PUT { enabled: "yes" }` | 状态码 400 | 真实 HTTP |
| 3 | 设置关闭，昨天有聊天无日记 | `generate` 一次都不调用，返回 `skipped: 'disabled'` | `runAutoDiary` |
| 4 | 设置开启；昨天有聊天且 `cornieText` 为空；前天有聊天且已有 `cornieText`；今天有聊天 | 只对昨天调用 `generate` 一次；今天与前天都不调用 | `runAutoDiary` |
| 5 | 有聊天的日期距 `today` 为 8 天 | 不生成 | `runAutoDiary` |
| 6 | 5 个缺失日期，`maxPerRun` 为 3 | 只生成最早的 3 个 | `runAutoDiary` |
| 7 | 第二个日期的 `generate` 抛错 | 第一个已生成并保留，第二个没有写入 `cornieText`，不再尝试第三个，返回含 `error` | `runAutoDiary` |
| 8 | 昨天有日记条目但 `cornieText` 为空串 | 视为缺失，会生成 | `runAutoDiary` |
| 9 | 设置页挂载，接口返回 `enabled: false`，点击复选框 | 调用 `saveDiaryAutoSetting(true)` 一次 | 设置页 |
| 10 | 日记页挂载，假桥触发 `{ domain: 'diary' }` | 重新读取日记列表一次 | `DiaryHomePage` |

日期、条数、状态码与复选框文字是测试里写死的字面量；"7 天"与"每次 3 篇"是第 2 部分写明的默认值。
