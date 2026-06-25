# Cornie 005 收支与类目模块改进设计

## 1. 模块目标

负责收入、支出、收支类目相关的全部业务能力，并支持 AI 自动记账与新增类目确认流。

## 2. 模块范围

- 收入记录
- 支出记录
- 收支类目
- 类目映射
- 类目新增确认

## 3. AI 相关设计

### 3.1 prompt 注入

每次涉及收支判断时，都必须注入：

- 当前全部支出类目
- 当前全部收入类目

### 3.2 规则

- 先映射现有类目
- 无法映射时返回新增类目请求
- 金额缺失时优先追问

## 4. 主要工具

- `ledger.add_expense`
- `ledger.add_income`
- `ledger.update_entry`
- `ledger.delete_entry`
- `ledger_category.list_expense`
- `ledger_category.list_income`
- `ledger_category.create_expense`
- `ledger_category.create_income`

---

**文档结束**
