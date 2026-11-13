# task-043c 组合操作在跨实例并发下不死锁

## 1. Where this task sits

- **Phase 3 记忆写入不丢、回复不等**，目标是回复在模型说完后立即完成，提炼在后台写入，两路并发写入不丢任何一页。
- **本任务推进 R-7 记忆写入在进程内全局串行**：证明合并、删除、挂接主题这类要碰多个索引的组合操作，在共享队列下既不死锁也不丢写。
- **Starts after**：task-043b 写队列按数据目录共享。**Waits on**：task-043d 提炼移到回复之后。

## 2. What the developer needs to know

**Read first**

- `electron/backend/memory-wiki/service.js` 的 `mergePages`、`delete`、`linkPageToTopic` — 它们依次调用 `update`、`archive`、`topicIndex.unlinkPage` 等会入队的方法。
- `electron/backend/memory-wiki/topicIndex.js` 的 `mergeTopics` — 先 `upsert`（入队）再单独入队一次，两次入队是顺序的而不是嵌套的。
- `tests/services/memory-wiki-concurrency.test.mjs` — 043a 的测试文件，本任务在其中追加用例。

**Settled**

- 不新增任何防重入机制：已核实现有四个存储的队列任务体内都没有再次入队，本任务只加测试，证明这一点会被持续守住（`doc/Cornie-040-审计后改进计划.md` R-7 的 Hard part）。
- 死锁判定固定：每个组合操作用 `Promise.race` 加 10 秒超时包裹，超时即失败，不用无限等待。
- 用例放进 043a 的同一个测试文件。

**Edges and seam**

- Seam：`createMemoryWikiService` 的 `mergePages`、`delete`、`linkPageToTopic`。不新增 seam。
- 只改测试文件；不改业务代码。

**Run**

- `node tests/services/memory-wiki-concurrency.test.mjs`
- `node scripts/verify-task465-delete-merge-index-writeback.mjs`
- `npm run lint`

**Unknowns**

- 如果某个组合操作超时，说明队列任务体内出现了嵌套入队。停止并报告是哪个方法，不要改成"超时后重试"。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：用跨实例并发的组合操作证明共享队列不死锁、不丢写。
2. 在测试文件里写 Case 1：先建 6 页，再让两个实例同时对不同页面执行合并、删除、挂接主题。
3. 写 Case 2：两个实例同时合并同一对页面的两个方向。
4. 给每个组合操作套 10 秒超时包装。
5. 运行测试，确认全部通过；连续运行 5 次。
6. 运行第 2 部分其余命令。
7. 提交：`test(memory): prove composite memory operations do not deadlock`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 6 页；实例甲合并页 1 与页 2，实例乙同时删除页 3 并把页 4 挂到主题 `并发主题` | 三个操作都在 10 秒内完成；`list({})` 长度为 5；页 2 状态为 `archived`；主题含页 4 | `mergePages`、`delete`、`linkPageToTopic` |
| 2 | 实例甲合并 `页5 → 页6`，实例乙同时合并 `页6 → 页5` | 两个操作都在 10 秒内结束（成功或抛错都算结束）；索引仍是合法 JSON，`list({})` 长度为 5 | `mergePages` |

预期的页数和状态由"建了 6 页、删了 1 页、合并归档 1 页"直接得出，不来自读代码。
