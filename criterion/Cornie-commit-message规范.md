# Cornie Git Commit Message 规范

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie Git Commit Message 规范 |
| 文件名称 | Cornie-commit-message规范.md |
| 产品名称 | Cornie（铃湾） |
| 文档编号 | Cornie-Criterion-Commit |
| 文档类型 | 规范 / 开发协作 |
| 文档版本 | V1.0 |
| 文档状态 | 生效 |
| 编写日期 | 2026-05-08 |
| 适用对象 | 研发 / 测试 / 运维 / 产品（可选） |
| 上游文档 | Cornie-doc文档规范.md |
| 下游文档 | - |
| 关联规范 | Cornie-doc文档规范.md |
| 存放目录 | criterion/ |

### 1.1 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
| ---- | ---- | ------ | -------- |
| V1.0 | 2026-05-08 | 叶健钦 / AI | 首次建立提交信息规范 |

## 2. 规范目的

- **可追溯**：看到一条提交就能理解改动意图，方便回溯与排障
- **可检索**：按类型/范围快速过滤（例如查所有 fix）
- **可协作**：多人合并时减少歧义，便于 Code Review 与发布说明生成

## 3. 提交信息格式（必须）

统一采用以下格式：

`<type>(<scope>): <subject>`

可选正文与脚注：

- 提交体（body）：解释“为什么这样改”，必要时写关键实现取舍
- 脚注（footer）：关联 Issue / 破坏性变更说明等

完整模板：

```text
<type>(<scope>): <subject>

<body>

<footer>
```

## 4. 字段规范

### 4.1 type（必填）

允许使用以下类型（尽量少而稳定）：

| type | 含义 | 典型场景 |
| --- | --- | --- |
| feat | 新增功能 | 新增用户可感知能力 |
| fix | 修复缺陷 | 修 bug、修回归 |
| perf | 性能优化 | 启动变快、占用下降 |
| refactor | 重构 | 不改变外部行为的结构调整 |
| docs | 文档 | 仅文档变更（含 PRD/规范） |
| test | 测试 | 单测/集成测试/测试数据 |
| build | 构建 | 打包、构建脚本、依赖构建链 |
| ci | CI | 工作流、流水线配置 |
| chore | 杂项 | 不影响产物功能的维护性工作 |
| revert | 回滚 | 回滚某次提交 |

### 4.2 scope（建议填）

`scope`用于标识影响范围，统一用小写英文/短横线，示例：

- `desktop`、`ui`、`chat`、`diary`、`db`、`ollama`、`build`、`docs`

如果影响面很大，可用：

- `core`（核心逻辑）
- `all`（全局性改动，谨慎使用）

### 4.3 subject（必填）

- **用祈使句/动词开头**：add / fix / update / remove / refactor
- **首字母小写**（除专有名词）
- **不加句号**
- **建议 ≤ 72 字符**（中文尽量一行内可读）
- **描述“做了什么 + 为何”中的“做了什么”**，“为何”放 body

示例（推荐）：

- `feat(chat): add local Qwen reply with streaming`
- `fix(db): prevent duplicate diary rows per date`
- `docs(prd): normalize headings and add document metadata`

反例（不推荐）：

- `update`（太笼统）
- `fix bug`（没有范围与具体点）
- `feat: 完成了很多功能`（不可追溯）

## 5. body（可选但推荐）

适用场景：

- 变更有取舍/限制/风险
- 修复了不易从 diff 看出来的问题
- 需要留下迁移/兼容说明

书写建议：

- 用条目列出关键点
- 解释**为什么**与**怎么验证**

示例：

```text
fix(ollama): handle model missing on startup

- show guided install flow when ollama not found
- avoid blocking UI thread during probe

Test: start app on clean machine, verify prompt and retry succeed
```

## 6. footer（可选）

### 6.1 关联问题

- `Refs: #123`
- `Closes: #123`（合并后自动关闭）

### 6.2 破坏性变更（必须标注）

当变更会导致兼容性破坏（数据格式、API、配置等）时：

- 在 type 后加 `!`：`feat(db)!: change diary schema`
- 或在 footer 中写：`BREAKING CHANGE: ...`

## 7. 文档/目录类提交的约定

- 涉及规范、PRD、设计文档：优先用 `docs(<scope>)`
- `scope`建议使用：`docs` / `prd` / `criterion`

示例：

- `docs(criterion): add commit message guideline`
- `docs(prd): align section numbering to document standard`

## 8. 允许的最小提交（MVP）

如果仓库很早期、改动非常小，至少满足：

`<type>: <subject>`

例如：

- `chore: init repo`
- `docs: add document criteria`
