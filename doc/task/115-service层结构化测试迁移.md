# 115 service层结构化测试迁移

## 1. 任务目标

把核心业务 service 的验证沉淀到 `tests/services`。

本任务完成后，应至少覆盖：

- ledger / ledger_category
- todo / todo_category
- schedule / schedule_category
- memory-wiki service
- topic index

## 2. 任务来源

- `doc/design/Cornie-0628-工具对齐与记忆治理及测试体系设计.md` 第 6.2 第二层、6.3 D/E 节

## 3. 涉及范围

- `tests/services/`
- `electron/backend/*/service.js`
- `package.json`

## 4. 当前问题

当前 service 层验证以散落的 `verify-task0xx` 为主，缺少统一结构化沉淀。

## 5. 目标设计

- service 生命周期测试归档到 `tests/services`
- 保留专项 `verify:*`

## 6. 实现步骤

### Step 1

挑最核心 service 建立结构化测试。

### Step 2

覆盖 CRUD 与生命周期。

### Step 3

补运行入口。

## 7. 测试点

- 核心 service 的 CRUD 与生命周期可断言

## 8. 完成标准

- service 层结构化测试存在
- 核心生命周期覆盖

## 9. 交付物

- `tests/services/*`

---

**文档结束**
