# 114 policy层结构化测试迁移

## 1. 任务目标

把 tool policy 和风险判定相关测试沉淀到 `tests/policy`。

本任务完成后，应至少覆盖：

- low risk allow
- medium risk 策略
- high risk confirm
- ask_back
- deny

## 2. 任务来源

- `doc/design/Cornie-0628-工具对齐与记忆治理及测试体系设计.md` 第 6.3 B 节

## 3. 涉及范围

- `tests/policy/`
- `electron/backend/policy/`
- `package.json`

## 4. 当前问题

policy 相关回归主要仍压在 `verify-task052` 与 `verify-task050` 上。

## 5. 目标设计

- 建立结构化 policy 测试
- 保留专项 `verify:*` 脚本

## 6. 实现步骤

### Step 1

建立 `tests/policy` 测试文件。

### Step 2

覆盖风险分支。

### Step 3

补运行入口。

## 7. 测试点

- allow/confirm/ask_back/deny 分支可断言

## 8. 完成标准

- policy 层结构化测试存在
- 关键风险分支覆盖

## 9. 交付物

- `tests/policy/*`

---

**文档结束**
