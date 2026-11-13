# Cornie-046 后台照顾与数据导出收口简报

## 1. Headline

**本期：Phase 6 的代码全部完成，`npm run test:full` 通过（前端 266 例），`npm run pack` 成功生成 `release/win-unpacked`。但打包版没能启动验证：这台机器上 Electron 本身起不来，所以提醒、系统通知、精灵气泡、自动日记、保存对话框都没有实机验证。**

基线：`doc/Cornie-040-审计后改进计划.md` 的 Phase 6（R-17 至 R-20）。

| # | Change | Where | Kind | State | What it means for the reader |
| --- | --- | --- | --- | --- | --- |
| P-1 | 数据变更广播；精灵角标显示未完成待办数 | `data-sync.js`、`client.js`、`ChatPanel.vue`、`CorneApp.vue` | New | Done（自动测试） | 主窗口新增待办或对话里写入待办后，精灵数量更新；每 60 秒也会自读一次 |
| P-2 | 提醒调度核心与迁移 v9 | `reminders/scheduler.js`、`db.js` | New | Done（自动测试） | 日程提前 30 分钟、待办到期时提醒一次，重启不重复，历史数据不被提醒 |
| P-3 | 提醒接入桌面通知与精灵气泡 | `reminders/desktop.js`、`main.js`、`preload.cjs` | New | Done（单元测试），**未实机验证** | 启动即补发，之后每分钟检查 |
| P-4 | 自动日记，设置里手动开启 | `diary/autoGenerate.js`、`settings/*`、`main.js`、`DiarySettings.vue` | New | Done（自动测试），**未实机验证** | 开启后启动时和每小时补写最近缺失的日记 |
| P-5 | 日记生成读错记忆目录 | `diary/service.js`、`server.js` | Fixed | Done | 打包后日记原先读安装目录 `process.cwd()`，现用数据目录 |
| P-6 | 日记失败时不再写占位文字 | `diary/generator.js` | Fixed | Done | 见第 2 节 |
| P-7 | 数据导出核心 | `export/exporter.js` | New | Done（自动测试） | 数据库快照（已去密钥）加记忆目录打成 zip |
| P-8 | 设置页"导出数据" | `export/desktop.js`、`DataSettings.vue`、`main.js` | New | Done（单元测试），**未实机验证** | 点按钮、弹保存对话框、写出 zip |

Routine：8 个提交（含本简报）；新增后端测试 `reminders`、`reminders-desktop`、`diary-auto`、`export`、`export-desktop`，`diary-service` 增 1 例；前端由 250 增至 266 例；新增开发依赖 `yauzl`（只用于测试读 zip）。

## 2. What it means

### 2.1 实施中发现并修复的两个缺陷

- **导出包会泄露模型密钥。** 简报设计是"在数据库副本上删掉密钥行"。测试 5 在整个文件字节里搜密钥串，发现仍搜得到：SQLite 的 `delete` 只把页标记为空闲，明文留在文件里。现在先 `pragma secure_delete = on`，再 `vacuum` 重建，才真正抹掉。存的密钥本来是 `safeStorage` 密文，但这个坑对任何敏感字段都成立。
- **自动日记会把占位文字当日记写进去。** `generateCornieDiary` 在模型失败或返回空时，会返回一句固定的"今天我在主人身边安静地陪着……"。手动生成时这很友好，但自动生成会给每个缺失日期写入这句话，且因为 `cornieText` 不再为空而永远不会重试，违反计划里"模型不可用时不写入，下次重试"。现增加 `strict` 选项，自动生成传 `strict: true`，失败直接上抛；手动生成行为不变。

### 2.2 对照验收项

- R-17：主窗口新增待办 → 精灵数量更新（测试）；对话工具写入 → 同样更新（测试）。**不做业务页自动刷新**：主窗口同一时刻只挂载一个模块，切换时本来就会重读；日记页在后台生成后订阅 `diary` 刷新。
- R-18：日程提前 30 分钟提醒一次（测试）；重启后不重复，靠 `reminders_sent` 表（测试）；已完成待办、已取消日程、无期限待办不提醒（测试）。
- R-19：昨天有聊天无日记 → 生成；已有日记不覆盖；模型失败不写入、下次重试（测试，含 P-6）。
- R-20：包含数据库与完整记忆目录；包内不含密钥；原库不被修改（测试，用独立的 `yauzl` 解析 zip）。"导出过程中继续写入不损坏导出包"：数据库取内存快照，记忆文件逐个读取且原本就是原子写入，所以读到的每个文件完整；但整个记忆目录不是同一时刻的快照，导出期间的写入可能让个别文件是新、另一些是旧。

### 2.3 产品决策来源

主人确认：提醒提前 30 分钟固定；错过的全部补发；自动日记默认关闭。实施者定的默认值（非主人给的数字）：自动日记回溯 7 天、每次最多 3 篇；一次到点超过 3 条合并为一条通知，标题"错过了 N 条提醒"。

## 3. Still open

### 3.1 未经实机验证

`npm run pack` 退出码 0，`release/win-unpacked/Cornie.exe` 与 `app.asar` 里包含全部新模块，且在 Electron 的 Node 里能成功导入这些模块和 `server.js`。但 `node scripts/verify-phase5-packaged-start.mjs` 失败（`/api/health` 不通）。原因不在本期代码：这台机器上 `node_modules/electron/dist/electron.exe --version` 也无输出，退出码 `0x80000003`（STATUS_BREAKPOINT），在 Claude 的 Bash、PowerShell 以及用户自己的终端里表现一致；把 `main.js` 换回 Phase 6 之前的版本，未打包的 Electron 同样起不来。所以以下都没有真正运行过：

- 提醒的系统通知、精灵气泡、点击无反应（本期不做点击打开主窗口）
- `main.js` 里的接线：提醒启动、每小时自动日记、IPC `cornie:export-data`
- 设置页保存对话框与导出文件
- 自动日记真实调用模型
- 精灵从 `file://` 加载时读取待办是否被跨域拦截（白名单已含，未验证）

复验步骤（先修好 Electron：重装 `npm ci`，或升级显卡驱动与系统后再试 `electron --version`，能打印版本号再继续）：

1. `npm run pack`，再 `node scripts/verify-phase5-packaged-start.mjs`，应输出 passed。
2. 启动应用，建一条 10 分钟后开始的日程，关闭主窗口只留精灵；（开始前 30 分钟已过，会立即提醒）确认系统通知和精灵气泡出现；稍后确认不重复。再建一条 45 分钟后的日程，确认约 15 分钟后提醒。
3. 建一条 5 分钟后开始的日程，关闭整个应用，等过了开始时间再打开，确认补发。
4. 设置里勾选"自动生成 Cornie 日记（会调用模型）"（需已配置密钥）。前一天有聊天且无日记时，重启后日记页应出现新日记；断网重试，确认不写入占位文字。
5. 设置页点"导出数据"，保存后用解压工具打开：应有 `cornie.sqlite3`、`memory-wiki/`、`manifest.json`；用文本编辑器在 `cornie.sqlite3` 里搜密钥前缀，应搜不到。

### 3.2 已知限制

- 日程时间是无时区字符串，按本机时区解析；机器时区与主人所在时区不同时，提醒会偏移。
- 导出一次性把数据库装进内存，不做流式；数据库很大时会占内存。
- 不做导入与恢复；点击系统通知不会打开主窗口。
- 提醒用 `setInterval`；电脑睡眠期间错过的提醒在唤醒后下一次检查时补发。
- 自动日记仅在应用运行时触发；回溯超过 7 天的缺失日记不会补。
- `verify-task452`、`verify-task053`、`verify-task124` 的既有问题仍在，与本期无关。
