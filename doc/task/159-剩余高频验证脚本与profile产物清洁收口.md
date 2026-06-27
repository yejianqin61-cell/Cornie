# 159-剩余高频验证脚本与profile产物清洁收口

## 1. 任务目标

在 `8.6 收紧测试产物与工程清洁度` 内，继续收口上一任务未覆盖的剩余高频脚本，重点解决仍直接把 sqlite 临时产物写到仓库根目录的验证脚本与 profile 脚本。

本任务完成后，应尽量做到：

1. 常用验证脚本不再默认污染仓库根目录
2. profile / verify 的默认临时产物路径统一到 `tmp/` 体系
3. 清洁检查能够覆盖这批剩余脚本的真实执行场景

## 2. 背景与现状

`158` 已完成：

1. 统一临时 sqlite helper
2. 高频 tests / verify 脚本迁移
3. `clean:tmp`、`clean:root-tmp`、`check:cleanliness`
4. 历史根目录 `tmp-*.sqlite` 存量清理

但当前仓库里仍有剩余脚本直接使用仓库根目录 tmp 路径：

1. `scripts/verify-task052-protocol-policy.mjs`
2. `scripts/verify-task053-orchestrator-confirm-services.mjs`
3. `scripts/profile-category-flow.mjs`

此外，`tests/shared/service-harness.mjs` 的 `baseDir` 当前仍在系统临时目录，虽不污染仓库，但还未与统一 helper 设计完全对齐。

## 3. 开发范围

涉及文件：

- `scripts/verify-task052-protocol-policy.mjs`
- `scripts/verify-task053-orchestrator-confirm-services.mjs`
- `scripts/profile-category-flow.mjs`
- `tests/shared/service-harness.mjs`
- 如有必要，补充 `scripts/tmp-artifacts.mjs`
- 如有必要，补充 `package.json` 中验证命令或清理命令

## 4. 具体开发项

### 4.1 剩余 verify 脚本迁移

将以下脚本的默认 sqlite 临时产物迁移到统一运行时目录：

1. `verify-task052-protocol-policy`
2. `verify-task053-orchestrator-confirm-services`

要求：

1. 执行完成后自动清理 sqlite
2. 不影响原有断言与输出

### 4.2 profile 脚本默认输出迁移

将 `profile-category-flow.mjs` 的默认 profile sqlite 输出改到统一临时目录，避免默认在仓库根目录产生 `tmp-profile-category-flow.sqlite`。

要求：

1. 若用户显式传 `--db`，仍尊重外部输入
2. 若未传 `--db`，走统一 tmp 目录

### 4.3 临时目录口径补齐

根据实际情况补齐：

1. `service-harness` 的 `baseDir` 是否也应支持统一 tmp helper
2. 清理脚本是否应继续兼容旧命名的历史目录

## 5. 验收标准

完成本任务时，至少应满足：

1. 上述剩余脚本不再默认向仓库根目录写入 sqlite 临时产物
2. 跑相关验证脚本后，仓库根目录保持无 `tmp-*.sqlite*`
3. `profile-category-flow.mjs` 默认输出路径已迁移
4. `check:cleanliness` 与清理命令仍能正常配合使用

## 6. 备注

若本任务完成后已没有剩余常用脚本默认污染仓库根目录，则 `8.6` 可进入最终复核；若仍发现新的高频污染源，再继续拆下一份 task。
