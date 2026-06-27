# 071 Memory Wiki 写工具与高风险分层

## 1. 任务目标

在只读工具基础上，补齐 `Memory Wiki` 写工具，并按风险等级区分普通写入、高风险写入和回滚型写入。

## 2. 任务来源

- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 10.5 节
- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 10.5.4 节
- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 16.3.5 节

## 3. 前置依赖

- `070-Memory-Wiki只读工具接入.md` 已完成

## 4. 涉及范围

- `electron/backend/memory-wiki/`
- `electron/backend/tools/`
- `electron/server.js`
- `scripts/`

## 5. 当前问题

模型如果不能通过工具访问写能力，前面做好的服务层、版本层就还没有真正接入 agent 主链路。

## 6. 目标设计

本任务完成后应具备：

- `memory_wiki.create_page`
- `memory_wiki.update_page`
- `memory_wiki.update_summary`
- `memory_wiki.update_aliases`
- `memory_wiki.set_status`
- `memory_wiki.set_importance`
- `memory_wiki.archive_page`
- `memory_wiki.restore_page`
- `memory_wiki.rollback_page`

## 7. 实现步骤

### Step 1

接入基础写工具。

### Step 2

接入元数据治理写工具。

### Step 3

接入回滚工具。

### Step 4

定义风险级别。

## 8. 测试点

- 写工具可被注册和调用。
- 高风险工具被标记为高风险。

## 9. 完成标准

- Memory Wiki 写工具进入统一工具体系。

## 10. 交付物

- 写工具代码
- 对应验证脚本

---

**文档结束**
