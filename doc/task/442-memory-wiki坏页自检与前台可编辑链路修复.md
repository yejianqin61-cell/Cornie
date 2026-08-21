# 442 memory wiki 坏页自检与前台可编辑链路修复

## 背景

当前长期记忆 wiki 已多次出现以下问题：

1. 某一页 frontmatter 因多行文本、错误字段写入或历史坏数据而结构损坏。
2. 记忆页列表、记忆工作台、聊天上下文注入都会被坏页连带影响。
3. 普通用户或高级入口在前端编辑记忆页时，无法稳定保存、再次打开或继续修改。

本次最新坏页表现为：

1. `identity/profiles/啥名字啊.md` 的 `summary` 被拆成多行裸文本。
2. 页面的 `page_type` 与目录语义不一致，主身份页被写成了 `identity_preference`。

## 目标

1. 修复当前坏页，恢复记忆页可读、可编辑。
2. 为 memory wiki 增加一条“全量坏页自检”能力。
3. 保证即便有历史坏页存在，前端页面列表也尽可能能继续加载。
4. 保证后续再次保存页面时，不再继续制造同类坏数据。

## 范围

- `electron/backend/memory-wiki/storage.js`
- `electron/backend/memory-wiki/service.js`
- `data/memory-wiki/pages/**`
- 必要时新增一个轻量校验脚本

## 设计要求

### 1. 坏页数据修复

当前已知损坏页面至少包括：

1. `data/memory-wiki/pages/identity/profiles/啥名字啊.md`

修复要求：

1. `summary` 恢复为合法单行 frontmatter。
2. `page_type` 与页面语义一致。
3. 保留原有来源引用、身份字段与正文信息。

### 2. 自检能力

新增一条面向开发的坏页扫描能力：

1. 递归扫描 `data/memory-wiki/pages` 下所有 `.md` 页面。
2. 检测 frontmatter 是否可解析。
3. 输出坏页文件路径和错误信息。

### 3. 读取隔离

继续保持并确认：

1. 单页 hydration 失败不拖垮列表。
2. 聊天注入长期记忆失败时自动降级。

### 4. 写入安全

确保通过前端编辑保存时：

1. 标量字段即便含换行，也能安全落盘。
2. 目录、`page_type`、结构化字段不出现明显错位。

## 验收标准

1. 长期记忆页列表可正常打开。
2. 当前坏页可被重新打开并继续编辑。
3. 聊天主链不再因该坏页持续报 `invalid memory wiki frontmatter line`。
4. 运行坏页扫描时，能明确看到是否仍存在异常页面。
