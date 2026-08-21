# 470 旧表退役与旧 memory 模块清理

## 背景

`db.js` 中 `memory_entries` 表与 CRUD 永久保留（仅数据兼容层），旧 `memory/` 模块运行时零引用（Cornie-018 D-17）；`memory/service.js` 的 `shouldWriteMemory` / `deriveMemoryFromConversation` 为正则判定死代码（Cornie-019 §4.10，随 444 一并弃用）。

## 目标

1. 评估 `memory_entries` 历史数据价值并处置（迁移或删除）。
2. 删除旧 `memory/` 模块与 `db.js` 中对应表/CRUD。
3. `db.js` 无 `memory_entries` 残留（或迁移后数据完整）。

## 范围

- `electron/db.js`（memory_entries 表与 CRUD 函数）
- `electron/backend/memory/`（service.js / search.js / summary.js / tools.js）
- 数据迁移脚本（如需）

## 设计要求

1. 评估 `memory_entries` 历史数据价值：
   - 有保留价值 → 迁移脚本导数据到 Memory Wiki（映射为页面）后删表；
   - 无价值 → 直接删除表与 CRUD 函数。
2. 删除旧模块（配合 444 正则弃用、467 死代码清理）。
3. 迁移后数据完整性校验。

## 验收标准

1. `db.js` 无 `memory_entries` 残留（或迁移后数据完整可查）。
2. `electron/backend/memory/` 目录无残留引用。
3. `npm run test:full` 全绿。

## 依赖与衔接

- 依赖：444（正则弃用）、467（死代码清理）、469（引擎统一后 db.js 迁移更安全）。
- 上游设计：Cornie-018 I-17（Phase 5）；Cornie-019 §4.10。
