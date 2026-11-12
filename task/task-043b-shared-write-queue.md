# task-043b 写队列按数据目录共享

## 1. Where this task sits

- **Phase 3 记忆写入不丢、回复不等**，目标是回复在模型说完后立即完成，提炼在后台写入，两路并发写入不丢任何一页。
- **本任务推进 R-7 记忆写入在进程内全局串行**：同一数据目录下无论有多少服务实例，对同一个 JSON 索引的读改写都排在同一条队列上。
- **Starts after**：task-043a 跨实例并发写入的红测试。**Waits on**：task-043c 组合操作的并发验证。

## 2. What the developer needs to know

**Read first**

- `electron/backend/memory-wiki/writeQueue.js` — 现有工厂函数，以及它为什么按调用创建独立队列。
- `electron/backend/memory-wiki/storage.js`（`page-index`）、`topicIndex.js`（`keyword-index`）、`versionStore.js`（`version-index`）、`governanceStore.js`（`review-queue`）— 四处 `createSingleWriterQueue()` 调用点。
- `tests/services/memory-wiki-concurrency.test.mjs` — 043a 写的红测试，本任务要让它转绿。

**Settled**

- 新增 `getSharedWriterQueue(key)`：模块级 `Map` 按键返回同一条队列；保留 `createSingleWriterQueue` 导出，不删除。
- 队列键固定为 JSON 文件的绝对路径：`path.resolve(filePath)`，在 `win32` 上再转小写（Windows 路径不区分大小写）。
- 四个存储都用各自 JSON 文件的路径取队列；页面 Markdown 文件本身不入队（每页一个文件，由 `atomicWriteFile` 保证单文件写入完整）。
- 审计日志是 `appendFile` 追加单行，不在本任务范围。
- 理由来自 `doc/Cornie-040-审计后改进计划.md` R-7。

**Edges and seam**

- Seam：`createMemoryWikiService` 的公开方法，即 043a 的测试。不新增 seam。
- 改 `writeQueue.js` 和上面四个存储文件；不改它们的对外方法。

**Run**

- `node tests/services/memory-wiki-concurrency.test.mjs`
- `node scripts/verify-task462-index-write-consistency.mjs && node scripts/verify-task465-delete-merge-index-writeback.mjs`
- `node tests/services/memory-wiki-service.test.mjs && node tests/memory-governance/memory-governance.test.mjs`
- `npm run lint`

**Unknowns**

- 队列任务内部如果再调用同一队列会死锁。已核实目前四处任务体内都没有嵌套入队；如果改动过程中发现某个任务体调用了另一个会入队的方法，停止并报告，不要自行重排。
- 模块级 `Map` 不会回收；测试里每个临时目录留下最多 4 个条目，可接受，不要为此增加清理逻辑。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：让同一 JSON 文件的所有写入排在同一条队列上，不论服务实例有几个。
2. 在 `writeQueue.js` 新增 `getSharedWriterQueue(key)`，键按 Settled 规范化。
3. 把 `storage.js` 的队列改为用 `page-index.json` 的路径取共享队列。
4. 同样改 `topicIndex.js`（`keyword-index`）、`versionStore.js`（`version-index`）、`governanceStore.js`（`review-queue`）。
5. 运行 `node tests/services/memory-wiki-concurrency.test.mjs`，确认 Case 1 至 Case 4 全部转绿；连续运行 5 次，每次都通过。
6. 运行第 2 部分其余命令，确认没有回归。
7. 提交：`fix(memory): share write queues per data file across service instances`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 043a 的 Case 1（两实例并发创建 20 页） | `list({})` 长度为 20，连续 5 次运行都成立 | `createMemoryWikiService` |
| 2 | 043a 的 Case 2（20 条治理请求） | 长度为 20 | `createMemoryWikiService` |
| 3 | 043a 的 Case 3（10 页链接同一主题） | `memoryPageIds` 长度为 10 | `getTopicIndex()` |
| 4 | 043a 的 Case 4（10 页各更新一次） | 每页恰好 1 条版本 | `listVersions` |
| 5 | 同一 `baseDir` 用大小写不同的路径取队列（仅 `win32`） | 返回同一条队列 | `getSharedWriterQueue` |

Case 1 至 4 的预期值是 043a 已确定的写入次数；Case 5 的预期来自 Windows 路径不区分大小写这一事实，在非 Windows 上跳过。
