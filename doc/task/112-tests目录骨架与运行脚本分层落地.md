# 112 tests目录骨架与运行脚本分层落地

## 1. 任务目标

为 `7.3` 测试体系建立正式的 `tests/` 目录骨架与分层运行脚本。

本任务完成后，应至少具备：

- `tests/` 目录结构
- `test:fast`
- `test:integration`
- `test:full`

## 2. 任务来源

- `doc/design/Cornie-0628-工具对齐与记忆治理及测试体系设计.md` 第 6.4、6.5 节

## 3. 涉及范围

- `tests/`
- `package.json`
- `scripts/`

## 4. 当前问题

当前仓库有大量 `verify:*` 脚本，但还没有正式的结构化测试目录与分层运行入口。

## 5. 目标设计

- `tests/protocol`
- `tests/policy`
- `tests/services`
- `tests/tools`
- `tests/orchestrator`
- `tests/memory-governance`

## 6. 实现步骤

### Step 1

创建目录骨架与最小占位测试。

### Step 2

在 `package.json` 注册 `test:*` 分层命令。

### Step 3

补最小验证脚本。

## 7. 测试点

- `tests/` 目录可被脚本引用
- `test:fast / integration / full` 可执行

## 8. 完成标准

- 测试目录与脚本分层存在
- 最小验证通过

## 9. 交付物

- 测试目录骨架
- 分层脚本入口

---

**文档结束**
