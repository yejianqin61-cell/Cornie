# 070 Memory Wiki 只读工具接入

## 1. 任务目标

为 `M5 工具集增量补全模块` 先接入 `Memory Wiki` 只读工具，让模型可以查询页面、列表和主题索引，而不立即开放高风险写操作。

## 2. 任务来源

- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 10.5 节
- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 13.3 节
- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 16.3.5 节 `M5 工具集增量补全模块`

## 3. 前置依赖

- `M1` 至 `M4` 已完成

## 4. 涉及范围

- `electron/backend/memory-wiki/`
- `electron/backend/tools/`
- `electron/server.js`
- `scripts/`

## 5. 当前问题

目前长期记忆能力都还停留在模块内部，没有正式暴露为模型可调用工具。

## 6. 目标设计

本任务完成后应具备：

- `memory_wiki.get_page`
- `memory_wiki.list_pages`
- `memory_wiki.search_topic_index`
- `memory_wiki.list_topic_index`

## 7. 实现步骤

### Step 1

定义只读工具接口。

### Step 2

接入服务层和索引层。

### Step 3

注册工具到系统。

### Step 4

补验证脚本。

## 8. 测试点

- 工具可被注册并执行。
- 页面和索引可通过工具查询。

## 9. 完成标准

- Memory Wiki 只读工具正式可用。

## 10. 交付物

- 只读工具代码
- 对应验证脚本

---

**文档结束**
