# 072 Memory Wiki 合并与主题维护工具

## 1. 任务目标

补齐 `Memory Wiki` 合并相关工具和主题维护工具，为后续人工治理、模型治理和前端能力对齐奠定基础。

## 2. 任务来源

- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 10.4B.1 节
- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 10.5.4 节
- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 16.3.5 节

## 3. 前置依赖

- `071-Memory-Wiki写工具与高风险分层.md` 已完成

## 4. 涉及范围

- `electron/backend/memory-wiki/`
- `electron/backend/tools/`
- `scripts/`

## 5. 当前问题

合并和主题维护是设计中明确要求的能力，但当前还没有真正的工具入口。

## 6. 目标设计

本任务完成后应具备：

- `memory_wiki.merge_pages`
- `memory_wiki.link_related_pages`
- `memory_index.update_aliases`
- `memory_index.link_page`

## 7. 实现步骤

### Step 1

接入页面关联维护工具。

### Step 2

接入主题索引维护工具。

### Step 3

实现最小 merge 工具链路。

### Step 4

补验证脚本。

## 8. 测试点

- 合并工具可执行。
- 索引维护工具可执行。

## 9. 完成标准

- Memory Wiki 高级治理工具具备最小可用性。

## 10. 交付物

- 合并与主题维护工具代码
- 对应验证脚本

---

**文档结束**
