# task-046e 数据导出核心

## 1. Where this task sits

- **Phase 6 不打开主窗口也照顾得到主人**，目标是主窗口关着时精灵会按时提醒，第二天打开就有铃湾写好的日记，主人能一键导出全部本地数据。
- **本任务推进 R-20 设置页能导出本地数据**：先做不依赖 Electron 的导出模块，把数据库快照和记忆目录打成一个压缩包，且不含模型密钥。
- **Starts after**：task-046d 跨日自动生成日记。**Waits on**：task-046f 导出接入桌面与设置页。

## 2. What the developer needs to know

**Read first**

- `electron/db.js` 的 `openDb` 与 `persist` — 库是 `sql.js` 的内存数据库，`store.db.export()` 返回当前完整快照的字节；落盘用原子写。
- `electron/backend/settings/service.js` — 模型密钥存在 `meta` 表，键 `settings.model.deepseek.apiKey`，值是 `safeStorage:v1:` 开头的密文；其余设置（地址、模型名、超时）不是密钥。
- `electron/backend/memory-wiki/constants.js` 的 `resolveMemoryWikiRoot(baseDir)` — 记忆目录（`<baseDir>/data/memory-wiki`），含页面 Markdown、索引、版本、审计、治理队列。
- `electron/backend/persistence/atomicWrite.js` — 记忆文件都是原子写入，所以读到的每个文件都是完整的。
- `package.json` — 运行时依赖里没有任何压缩库。

**Settled**

- 新模块 `electron/backend/export/exporter.js`，导出 `buildExportArchive({ store, memoryRoot, now })`，返回 `Promise<Buffer>`（zip 字节）。写盘由调用方负责（046f）。
- 包内容固定：`cornie.sqlite3`（数据库快照，已去掉 `settings.model.deepseek.apiKey` 一行）、`memory-wiki/` 下全部文件（保持相对路径）、`manifest.json`（`{ app: 'Cornie', exportedAt: <ISO 时间>, files: [路径列表] }`）。不含遥测数据（`data/telemetry`）。
- 数据库快照做法：用 `sql.js` 把 `store.db.export()` 的字节装进一个**新的**内存数据库，在副本上删除密钥行后再导出；绝不修改正在使用的数据库。
- 压缩包由本模块自己写（项目没有压缩库，不新增运行时依赖）：每个文件用 `zlib.deflateRawSync` 压缩，CRC32 用自己实现的查表算法（不依赖 Node 的 `zlib.crc32`，因为打包版 Electron 内置的 Node 版本不一定有它）；中文文件名用 UTF-8，并设置通用标志位 bit 11。
- 记忆目录不存在时，包里没有 `memory-wiki/` 条目，不报错。
- 测试用 `yauzl` 读包（它是 `electron` 的间接依赖，锁文件里已有）：先运行 `npm install --save-dev yauzl@2.10.0` 把它显式加入 `devDependencies` 并提交锁文件改动；版本号取自 `node -p "require('yauzl/package.json').version"` 的输出。

**Edges and seam**

- Seam：新模块 `buildExportArchive`，注入 `store` 与 `memoryRoot`，这是本阶段计划里允许的第二个新 seam（`doc/Cornie-040-审计后改进计划.md` R-20）。
- 新增 `exporter.js` 与 `tests/services/export.test.mjs`；改 `package.json` 与 `package-lock.json`（只为加 `yauzl`）。

**Run**

- `node tests/services/export.test.mjs`
- `npm run lint`

**Unknowns**

- 如果 `npm install --save-dev yauzl@2.10.0` 因网络失败，停止并报告，不要改成自己手写 zip 读取器。
- 数据库很大时一次性装入内存会占内存；本任务不做流式导出，在收口简报里记录。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：把数据库快照（去掉密钥）和记忆目录打成一个 zip，并用独立的解压库验证。
2. 运行 `npm install --save-dev yauzl@2.10.0`，确认 `package.json` 与锁文件只多了这一项。
3. 先写 Case 1 至 Case 7 的红测试（测试里用 `yauzl` 读包）。
4. 实现 `exporter.js`：CRC32、zip 写入、数据库副本去密钥、遍历记忆目录。
5. 运行第 2 部分的两条命令。
6. 提交：`feat(export): archive the local database and memory wiki without the model key`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 临时库写入一条日记；记忆目录含 `pages/event/咖啡.md`（中文文件名）和 `index/page-index.json` | 用 `yauzl` 能列出 `cornie.sqlite3`、`memory-wiki/pages/event/咖啡.md`、`memory-wiki/index/page-index.json`、`manifest.json` | `buildExportArchive` |
| 2 | 解出包里的 `memory-wiki/pages/event/咖啡.md` | 内容与源文件逐字节相同（含中文） | `buildExportArchive` |
| 3 | 把包里的 `cornie.sqlite3` 解出，用 `sql.js` 打开 | 能读到那条日记；`meta` 表里没有键 `settings.model.deepseek.apiKey` | `buildExportArchive` |
| 4 | 导出前先 `setAppSetting` 写入密钥行 | 导出后**原库**里该行仍在；包里的库没有；地址、模型名等其他设置仍在 | `buildExportArchive` |
| 5 | 在整个压缩包的字节里搜索测试用的假密钥串 `sk-secret-for-test` | 找不到（也在 `cornie.sqlite3` 解压内容里找不到） | `buildExportArchive` |
| 6 | 记忆目录不存在 | 包里只有 `cornie.sqlite3` 与 `manifest.json`，不抛错 | `buildExportArchive` |
| 7 | `manifest.json` | 可解析；`files` 与包里的文件列表一致；`exportedAt` 等于注入的 `now` 的 ISO 形式 | `buildExportArchive` |

文件内容、文件名与假密钥串是测试里写死的字面量；zip 的正确性由独立的 `yauzl` 解析器判定，而不是读被测代码。
