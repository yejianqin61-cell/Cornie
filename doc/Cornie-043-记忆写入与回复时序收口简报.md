# Cornie-043 记忆写入与回复时序收口简报

## 1. Headline

**本期：Phase 3 全部完成；同一数据目录下的记忆写入全局串行，回复不再等待记忆提炼。`npm run test:full` 通过。**

基线：`doc/Cornie-040-审计后改进计划.md` 的 Phase 3（R-7、R-8）。

| # | Change | Where | Kind | State | What it means for the reader |
| --- | --- | --- | --- | --- | --- |
| G-1 | 跨实例并发写入的失败测试 | `tests/services/memory-wiki-concurrency.test.mjs` | New | Done | 先复现丢更新，再修复 |
| G-2 | 写队列按 JSON 文件路径在模块级共享 | `memory-wiki/writeQueue.js` 及四个存储 | Fixed | Done | 无论有几个服务实例，`page-index`、`keyword-index`、`version-index`、`review-queue` 的读改写都排在同一条队列上 |
| G-3 | 合并、删除、挂接主题的跨实例并发测试，并让原子重命名重试瞬时错误 | 同一测试文件、`persistence/atomicWrite.js` | New / Fixed | Done | 组合操作不死锁；Windows 上读写碰撞不再偶发 EPERM |
| G-4 | 先保存回复再启动提炼，提炼在后台执行 | `agent/orchestrator.js` | Changed | Done | `done` 不再等一次额外的模型调用，且 `done` 时回复已落库 |
| G-5 | 模型失败产生的兜底回复不送去提炼 | `agent/orchestrator.js` | Fixed | Done | 提炼不会把"没把话说明白"当成铃湾说过的话 |
| G-6 | 真实 HTTP 的时序与并发端到端用例 | `tests/services/phase3-memory-e2e.test.mjs` | New | Done | 回复秒回、后台提炼与界面写入并发不丢页 |

Routine：7 个提交；`memory-wiki-concurrency` 测试 8 例，编排器测试由 7 例增至 11 例，`phase3-memory-e2e` 由 3 例增至 4 例。

## 2. What it means

对照 R-7、R-8 的验收项：

- R-7：两个实例并发创建 20 页，索引恰好 20 条；20 条并发治理请求全部保留；10 页并发链接同一主题、10 页并发更新，各自完整；现有单实例测试全部通过。修复前同一场景只剩 6 至 7 页、5 至 6 条，或在 Windows 上因并发重命名失败。
- R-8：提炼被闸门挡住时，流式请求仍然收到 `done`，随后读历史能看到用户与 Cornie 两条消息；提炼失败只写审计，不影响已返回的回复；兜底回复不触发提炼，正常回复恰好触发一次。
- 加固 R-5：后台提炼与界面并发写入时，5 次界面创建加 1 次提炼创建，恰好 6 页且标题互不相同。

与简报的差异，均不影响验收：

1. 043a 的红测试在 Windows 上先失败于 `EPERM`（并发重命名同一索引文件），而不是简报预期的"条数不足"。两者是同一个缺陷：未串行的写入互相冲突。
2. 043c 暴露了一个简报没有预料的偶发问题：索引的读取不入队，Windows 上某个读取正占用索引文件时，另一处的原子重命名会瞬时 `EPERM`。`atomicWriteFile` 现在对 `EPERM` 和 `EBUSY` 做最多 5 次短退避重试，其他错误不重试。重试间隔 10 至 160 毫秒。
3. `service-harness` 对编排器模块用惰性导入：`telemetry-store` 测试需要先设环境变量再加载遥测模块，静态导入会让它先被加载而失败。

## 3. Still open

- 应用退出时仍有提炼在后台进行：本期没有处理，进行中的提炼可能在窗口关闭时被截断。
- `verify-task452` 和 `verify-task053` 单独运行时本来就会报"duplicate tool registration"（在上一提交上同样失败），它们不在门禁里，保持原状；`verify-task053` 的环境关闭是同步函数，也没有加等待提炼的逻辑。
- 索引的读取仍然不入队。重命名重试解决了瞬时冲突，但读取到的内容可能是某次写入之前的快照。
- 审计日志、版本快照文件仍不经队列：审计是单行追加，版本快照每次写一个新文件。
