# task-043a 跨实例并发写入的红测试

## 1. Where this task sits

- **Phase 3 记忆写入不丢、回复不等**，目标是回复在模型说完后立即完成，提炼在后台写入，两路并发写入不丢任何一页。
- **本任务推进 R-7 记忆写入在进程内全局串行**：先把"同一数据目录下多个服务实例并发写入会丢更新"复现成一个进入门禁的失败测试。
- **Starts after**：Phase 2 已收口。**Waits on**：task-043b 把写队列改为按数据目录共享。

## 2. What the developer needs to know

**Read first**

- `electron/backend/memory-wiki/writeQueue.js` — 现在每次调用 `createSingleWriterQueue()` 得到一条独立队列。
- `electron/backend/memory-wiki/storage.js`、`topicIndex.js`、`versionStore.js`、`governanceStore.js` — 四个存储各自在工厂函数里创建一条队列，保护 `page-index`、`keyword-index`、`version-index`、`review-queue` 四个 JSON 文件。
- `scripts/verify-task462-index-write-consistency.mjs` — 现有并发测试只用了一个服务实例，所以没有暴露问题。
- `tests/shared/service-harness.mjs` — 测试怎么建临时数据目录和数据库。

**Settled**

- 新测试放在 `tests/services/memory-wiki-concurrency.test.mjs`，这样它属于 `npm run test:fast` 和 `test:full` 的门禁（`scripts/run-tests.mjs` 的 `services` 目录）。
- 复现方式固定：在同一个 `baseDir` 上用 `createMemoryWikiService` 建两个实例，交替发起并发写入。
- 已实测（2026-11-12）：两个实例各 10 次并发 `create` 共 20 页，`list` 只剩 6 至 7 页；20 条并发治理请求只剩 5 至 6 条。这就是本任务要证明的缺陷。

**Edges and seam**

- Seam：`createMemoryWikiService` 的公开方法，加上 `getTopicIndex()`、`getVersionStore()`。不新增 seam。
- 只新增一个测试文件；不改业务代码。

**Run**

- `node tests/services/memory-wiki-concurrency.test.mjs`
- `node scripts/verify-task462-index-write-consistency.mjs`
- `npm run lint`

**Unknowns**

- 并发丢更新是概率性的。如果新测试偶尔通过，不要加 `setTimeout` 之类的拖延；把并发数提高到 40 再试，仍不稳定则停止并报告。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：在同一数据目录上用两个服务实例并发写，证明现状会丢更新。
2. 新建测试文件，写 Case 1：交替用两个实例各并发 `create` 20 页。
3. 写 Case 2：交替用两个实例并发 `createGovernanceRequest` 共 20 条。
4. 写 Case 3：先建 10 页，再交替用两个实例的 `getTopicIndex().linkPage('并发主题', pageId)` 并发链接。
5. 写 Case 4：先建 10 页，再交替用两个实例并发 `update` 各页的摘要，随后读版本索引。
6. 运行测试，确认四个用例全部为红，且失败原因是条数不足而不是其他异常；贴出失败输出。
7. 运行 `node scripts/verify-task462-index-write-consistency.mjs`，确认现有单实例测试仍通过。
8. 提交：`test(memory): expose lost updates across service instances`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 两个实例交替并发 `create` 共 20 页 | `list({})` 长度为 20 | `createMemoryWikiService` |
| 2 | 两个实例交替并发创建 20 条治理请求 | `listGovernanceRequests` 长度为 20 | `createMemoryWikiService` |
| 3 | 10 页分别并发链接到同一主题 | 该主题的 `memoryPageIds` 长度为 10 | `getTopicIndex()` |
| 4 | 10 页各并发更新一次 | 每页 `listVersions(pageId)` 恰好 1 条，共 10 页 | `listVersions` |

预期值由"发起了几次写入"直接决定（20、20、10、10），不来自读代码；现状的 6 至 7 页、5 至 6 条是 2026-11-12 的实测。
