# 129 DeepSeek-only 代码与目录收口

## 1. 任务目标

彻底收口运行时代码中的本地模型遗留项，保证 Cornie 在代码层只保留 `DeepSeek-only` 正式方案。

## 2. 任务来源

- `doc/Cornie-013-当前项目完成度复评与后续行动建议.md` 第 `8.3` 节

## 3. 前置依赖

- `128` 已完成

## 4. 涉及范围

- `electron/backend/`
- 必要时 `criterion/` 中的工程规范补充

## 5. 当前问题

当前运行时代码已经主要走 DeepSeek，但仓库中仍保留：

- `electron/backend/ollama/client.js`

这会造成：

- 设计口径与代码口径不完全一致
- 后续维护者误判 Cornie 仍支持本地模型
- 8.3 阶段无法证明已完成 DeepSeek-only 收口

## 6. 目标设计

- 删除或降级本地模型运行时代码遗留
- 保证运行时代码目录只表达 DeepSeek 正式方案
- 避免主链路、辅助链路、测试链路再出现 Ollama 运行时依赖

## 7. 实现步骤

### Step 1

审计 `electron/backend/` 下所有模型调用入口与目录结构。

### Step 2

删除 `electron/backend/ollama/client.js` 或等价运行时遗留模块。

### Step 3

确认不会有任何运行时代码再引用 Ollama / 本地模型路径。

## 8. 测试点

- `electron/backend/` 下不再保留 Ollama 正式运行时代码
- DeepSeek 主链路仍然可构建、可验证
- 删除遗留后不会影响现有 `model/status` 与对话编排依赖

## 9. 完成标准

- 运行时代码层不再保留本地模型正式模块
- 仓库结构已明确体现 `DeepSeek-only`

## 10. 交付物

- 代码清理提交
- 对应验证记录

---

**文档结束**
