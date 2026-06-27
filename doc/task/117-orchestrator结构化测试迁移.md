# 117 orchestrator结构化测试迁移

## 1. 任务目标

把 conversation orchestrator 关键主链路测试沉淀到 `tests/orchestrator`。

本任务完成后，应至少覆盖：

- 纯回复链路
- 单轮工具调用链路
- 只读补查链路
- confirm 链路
- followup 回复链路
- 脏 JSON 修复链路

## 2. 任务来源

- `doc/design/Cornie-0628-工具对齐与记忆治理及测试体系设计.md` 第 6.3 C 节

## 3. 涉及范围

- `tests/orchestrator/`
- `electron/backend/agent/orchestrator.js`
- `package.json`

## 4. 当前问题

现有 orchestrator 回归主要在 `verify-task053`，还不是结构化测试资产。

## 5. 目标设计

- 保留 `verify-task053`
- 把主链路测试沉淀到 `tests/orchestrator`

## 6. 实现步骤

### Step 1

建立结构化 orchestrator 测试文件。

### Step 2

覆盖核心主链路分支。

### Step 3

补运行入口。

## 7. 测试点

- reply/tool/confirm/ask_back/followup/repair 分支可断言

## 8. 完成标准

- orchestrator 结构化测试存在

## 9. 交付物

- `tests/orchestrator/*`

---

**文档结束**
