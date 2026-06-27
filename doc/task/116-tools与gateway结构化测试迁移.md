# 116 tools与gateway结构化测试迁移

## 1. 任务目标

把工具注册、gateway 分发和工具结果封装的验证沉淀到 `tests/tools`。

本任务完成后，应至少覆盖：

- tool registry
- gateway 分发
- tool 结果封装
- 只读 / 高风险工具口径

## 2. 任务来源

- `doc/design/Cornie-0628-工具对齐与记忆治理及测试体系设计.md` 第 6.2 第三层

## 3. 涉及范围

- `tests/tools/`
- `electron/backend/tools/`
- `package.json`

## 4. 当前问题

现有工具验证多数是按业务域拆开的专项脚本，缺少 gateway 视角的结构化测试。

## 5. 目标设计

- 将工具层抽象测试沉淀到 `tests/tools`

## 6. 实现步骤

### Step 1

补 registry / gateway 基础用例。

### Step 2

覆盖风险等级与结果封装。

### Step 3

补运行入口。

## 7. 测试点

- 工具注册与分发可断言
- 风险等级与结果封装稳定

## 8. 完成标准

- tools/gateway 结构化测试存在

## 9. 交付物

- `tests/tools/*`

---

**文档结束**
