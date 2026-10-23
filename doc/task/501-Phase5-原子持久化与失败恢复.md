# 501 Phase 5 原子持久化与失败恢复

## 1. Where this task sits

- **Phase 5 安装包离开开发机也能演示**：目标是写入中断后仍能恢复完整数据快照。
- 本任务收口 SQLite 文件、Memory Wiki 索引和治理队列的原子写入。
- **开始前**：任务 498 完成。**等待它**：任务 504 的重启恢复检查。

## 2. What the developer needs to know

**Read first**

- `electron/db.js` — 当前 SQLite `export()` 和同步写入路径。
- `electron/backend/memory-wiki/storage.js` — 页面和 page-index 写入路径。
- `electron/backend/memory-wiki/topicIndex.js` — keyword index 读改写路径。
- `electron/backend/memory-wiki/governanceStore.js` — review queue 写入路径。
- `electron/backend/memory-wiki/writeQueue.js` — 进程内串行写入约束。

**Settled**

- 临时文件必须与目标文件在同一目录，再通过 rename 替换。
- 写入失败不能删除上一份可读快照。
- 只修共享持久化 helper，不在每个业务服务重复补丁。

**Edges and seam**

- 接缝是数据库快照和三个 Memory Wiki JSON 索引的写入函数。
- 不改变页面格式、索引字段或业务状态机。

**Run**

- `npm run test:full`
- `npm run build`

**Unknowns**

- 若 Windows rename 覆盖行为需要额外备份策略，先用真实文件操作确认，再决定是否保留旧快照。

## 3. The workflow

1. 阅读第 2 部分，复述：一次写入失败不能破坏上一份完整快照。
2. 写失败测试，模拟临时文件写入或替换失败。
3. 为共享写入路径增加同目录临时文件和替换语义。
4. 验证页面文件、索引、治理队列和 SQLite 的旧快照可读。
5. 验证进程重启后不会读取半截 JSON 或数据库。
6. 运行全量门禁、构建并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| SQLite 写入 | 正常快照 | 文件可重载 | `store.persist()` |
| SQLite 中断 | 替换失败 | 旧库仍可打开 | db persistence |
| 页面写入 | 页面更新 | 文件完整且可解析 | page storage |
| 索引中断 | JSON 替换失败 | 上一索引仍可读 | index writer |
| 重启恢复 | 关闭后重载 | 页面、索引、队列一致 | storage reopen |
