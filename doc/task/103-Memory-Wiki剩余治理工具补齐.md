# 103 Memory-Wiki剩余治理工具补齐

## 1. 任务目标

补齐 Memory Wiki 与 Topic Index 在 7.1 中尚未完成的治理工具。

本任务完成后，应至少具备：

- `memory_wiki.get_versions`
- `memory_wiki.get_version_diff`
- `memory_wiki.list_audit_events`
- `memory_wiki.inspect_broken_links`
- `memory_wiki.inspect_orphan_pages`
- `memory_wiki.delete_page`
- `memory_index.get`
- `memory_index.list`
- `memory_index.merge_topics`
- `memory_index.unlink_page`

## 2. 任务来源

- `doc/design/Cornie-0628-工具对齐与记忆治理及测试体系设计.md` 第 4.3 节 D 部分

## 3. 涉及范围

- `electron/backend/memory-wiki/service.js`
- `electron/backend/memory-wiki/tools.js`
- `electron/backend/memory-wiki/topicIndex.js`
- `electron/backend/memory-wiki/audit.js`
- `electron/backend/memory-wiki/inspector.js`
- `scripts/`
- `package.json`

## 4. 当前问题

当前 Memory Wiki 已具备核心治理能力，但工具暴露仍不完整，导致：

- 版本历史不能完整补查
- 审计日志不能直接读取
- 断链/孤儿巡检不能直接触发
- 主题索引治理动作不完整

## 5. 目标设计

- 剩余治理工具均按正式设计补齐
- 只读与高风险动作明确分层
- 主题级合并与解除关联语义稳定

## 6. 实现步骤

### Step 1

补齐 Memory Wiki 版本、审计、巡检、删除工具。

### Step 2

补齐 Memory Index 读取、合并、解除关联工具。

### Step 3

补验证脚本。

## 7. 测试点

- 可正确读取版本和差异
- 可读取审计日志
- 可运行断链和孤儿巡检
- 主题合并后引用迁移正确

## 8. 完成标准

- 10 项工具补齐完成
- 风险分层清晰
- 最小验证通过

## 9. 交付物

- Memory Wiki 治理工具代码
- 验证脚本

---

**文档结束**
