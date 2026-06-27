# 118 memory-governance结构化测试迁移

## 1. 任务目标

把记忆治理专项验证沉淀到 `tests/memory-governance`。

本任务完成后，应至少覆盖：

- 页面合并来源迁移
- 回滚一致性
- inactive / archived 行为
- 热度衰减排序
- 巡检候选入池

## 2. 任务来源

- `doc/design/Cornie-0628-工具对齐与记忆治理及测试体系设计.md` 第 6.3 E 节

## 3. 涉及范围

- `tests/memory-governance/`
- `electron/backend/memory-wiki/`
- `package.json`

## 4. 当前问题

记忆治理能力已经有很多 `verify:*`，但还没有形成结构化测试资产。

## 5. 目标设计

- 以治理专题为单位沉淀结构化测试

## 6. 实现步骤

### Step 1

挑最关键治理链路建立结构化测试。

### Step 2

覆盖合并、回滚、热度、入池等逻辑。

### Step 3

补运行入口。

## 7. 测试点

- 记忆治理关键链路可结构化回归

## 8. 完成标准

- memory-governance 结构化测试存在

## 9. 交付物

- `tests/memory-governance/*`

---

**文档结束**
