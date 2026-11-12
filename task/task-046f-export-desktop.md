# task-046f 导出接入主进程与设置页

## 1. Where this task sits

- **Phase 6 不打开主窗口也照顾得到主人**，目标是主窗口关着时精灵会按时提醒，第二天打开就有铃湾写好的日记，主人能一键导出全部本地数据。
- **本任务推进 R-20 设置页能导出本地数据**：设置页点"导出数据"，主进程弹保存对话框，把 046e 的压缩包写到主人选的位置。
- **Starts after**：task-046e 数据导出核心。**Waits on**：task-046g 收口。

## 2. What the developer needs to know

**Read first**

- `electron/main.js` — 窗口与 IPC 注册的位置；`dialog` 已导入；`resolveMemoryBaseDir()` 给出记忆数据的根。
- `electron/preload.cjs` — 桥的写法：请求用 `ipcRenderer.invoke`。
- `electron/backend/export/exporter.js` — 046e 的 `buildExportArchive`。
- `src/renderer/components/settings/SettingsPage.vue`、`ModelSettings.vue`、`SettingsSection.vue` — 设置页的小节写法与现有文案风格（简短，无说明性段落，见 `.agent` 里的规则）。
- `electron/backend/persistence/atomicWrite.js` — 写文件用原子写。

**Settled**

- 主进程处理函数放进可测试的模块 `electron/backend/export/desktop.js`，导出 `handleExportRequest({ store, memoryRoot, now, showSaveDialog, writeFile })`，返回 `{ ok: true, path, bytes }`、`{ ok: false, canceled: true }` 或 `{ ok: false, error }`。`main.js` 注册 `ipcMain.handle('cornie:export-data', ...)` 并传入真实的 `dialog.showSaveDialog` 与 `atomicWriteFile`。
- 默认文件名 `cornie-export-<YYYYMMDD-HHmmss>.zip`（用注入的 `now` 的本地时间），过滤器只允许 `.zip`。主人取消对话框 → 返回 `canceled`，不写文件、不报错。
- 导出前先调用 `store.persist()` 一次，让磁盘上的数据库与内存一致（`export()` 本身取内存快照，这一步让主人手里的数据库文件也是最新的）。
- 桥新增 `exportData()`（`ipcRenderer.invoke('cornie:export-data')`）。
- 设置页新增小节组件 `DataSettings.vue`：一个按钮"导出数据"；进行中禁用并显示"导出中..."；成功显示"已导出到 <路径>"；失败显示错误文字；主人取消时什么也不显示。没有桥（非桌面环境）时按钮禁用。
- 本任务不做导入与恢复。

**Edges and seam**

- Seam：`handleExportRequest`（注入保存对话框与写文件函数），加设置页用假桥的前端测试。不新增 seam。
- 新增 `desktop.js`、`DataSettings.vue` 与它们的测试；改 `main.js`、`preload.cjs`、`SettingsPage.vue`。

**Run**

- `node tests/services/export-desktop.test.mjs`
- `npx vitest run src/renderer/components/settings`
- `node scripts/verify-task121-electron-startup-chain.mjs`
- `npm run lint`

**Unknowns**

- 主人选的目录没有写权限时写文件会抛错：按 `{ ok: false, error }` 返回，不要吞掉也不要重试。
- 与 046c 相同：`main.js` 的接线要到打包后的实机验证（046g）才能真正确认。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：设置页一个按钮，经主进程弹保存对话框，把导出包写到主人选的位置。
2. 先写 `handleExportRequest` 的 Case 1 至 Case 4 红测试，再实现它。
3. 先写设置页的 Case 5 至 Case 7 红测试，再写 `DataSettings.vue` 并加进设置页。
4. 在 `preload.cjs` 加 `exportData`，在 `main.js` 注册处理函数。
5. 运行第 2 部分的四条命令。
6. 提交：`feat(export): export all local data from the settings page`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 假保存对话框返回路径 `X.zip`，假写文件函数记录入参 | 写入路径为 `X.zip`，内容是合法 zip（以字节 `PK` 开头）；返回 `ok: true` 与该路径 | `handleExportRequest` |
| 2 | 假保存对话框返回已取消 | 不调用写文件；返回 `{ ok: false, canceled: true }` | `handleExportRequest` |
| 3 | 假写文件函数抛 `EACCES` | 返回 `ok: false` 且 `error` 含该信息 | `handleExportRequest` |
| 4 | `now` 为本地时间 2026-11-12 21:05:09 | 传给对话框的默认文件名是 `cornie-export-20261112-210509.zip` | `handleExportRequest` |
| 5 | 设置页挂载，假桥 `exportData` 返回 `{ ok: true, path: 'D:/a.zip' }`，点击"导出数据" | 页面显示"已导出到 D:/a.zip" | `DataSettings` |
| 6 | 假桥返回 `{ ok: false, canceled: true }` | 页面不显示成功也不显示错误；按钮恢复可点 | `DataSettings` |
| 7 | 没有 `window.cornieDesktop` | 按钮禁用 | `DataSettings` |

路径、文件名与提示文字是测试里写死的字面量。
