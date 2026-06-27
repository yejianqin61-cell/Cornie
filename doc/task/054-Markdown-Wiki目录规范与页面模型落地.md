# 054 Markdown Wiki 目录规范与页面模型落地

## 1. 任务目标

为长期记忆 `LLM wiki` 建立第一层可落地的 Markdown 存储底座，明确目录结构、页面类型目录映射、`page_id` / `slug` / 页面元数据模型，并形成统一代码入口。

## 2. 任务来源

- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 6 节
- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 16.3.1 节 `M1 Markdown Wiki 存储模块`

## 3. 前置依赖

- 无

## 4. 涉及范围

- `electron/backend/memory-wiki/`
- `package.json`
- `doc/task/`

## 5. 当前问题

当前项目只有旧的 `memory_entries` 结构化表，没有 `md wiki` 存储底座，导致：

- 长期记忆还不是正式设计要求的 Markdown 页面。
- 页面类型、路径规则、页面字段模型没有统一定义。
- 后续服务层、工具层、人类界面层没有可靠存储基础。

## 6. 目标设计

本任务完成后应具备：

- `data/memory-wiki/pages/` 与 `data/memory-wiki/index/` 基础目录约定。
- 页面类型到目录的统一映射规则。
- `page_id`、`slug`、文件名、页面相对路径的生成规则。
- 页面元数据对象模型与默认值规则。
- 统一的存储模块入口，供后续任务继续扩展。

## 7. 实现步骤

### Step 1

创建 `memory-wiki` 模块目录与基础常量。

### Step 2

定义页面类型目录映射、`slug` 规则、`page_id` 规则。

### Step 3

定义页面元数据规范与默认值装配函数。

### Step 4

补最小验证脚本，确认基础规则可运行。

## 8. 测试点

- 页面类型是否能稳定映射到目录。
- `slug` 是否可用于 Windows 文件名。
- `page_id` 是否稳定生成。
- 默认元数据是否完整。

## 9. 完成标准

- `memory-wiki` 基础存储模块已创建。
- 目录与页面模型规则在代码中固化。
- 后续任务可以直接基于该模块继续开发。

## 10. 交付物

- `memory-wiki` 基础模块代码
- 最小验证脚本

---

**文档结束**
