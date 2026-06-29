# 335-Identity主身份页模型与跨天稳定注入

## 1. 任务目标

建立 `identity_profile` 主身份页模型，并让其成为模型每次对话时默认稳定注入的跨天 Identity 主源。

本任务完成后，应至少具备：

- 用户主身份页正式建模
- 支持名字、称呼、与 Cornie 的关系等核心字段
- Prompt 构建时优先稳定注入主身份页摘要
- 修复“昨天说过名字，今天忘了”的最小闭环

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/memory-wiki/`
- `electron/backend/agent/wikiContext.js`
- `electron/backend/agent/contextBuilder.js`
- `electron/backend/agent/promptBuilder.js`

## 4. 当前问题

当前跨天对话主要依赖：

- 当天聊天历史
- Wiki 页面摘要的泛化排序注入

但没有“Identity 主身份页”的强优先级稳定注入规则。

## 5. 目标设计

### 5.1 主身份页结构

主身份页至少承载：

- 用户名字
- 偏好称呼
- 用户与 Cornie 的关系
- 身份摘要
- 当前阶段画像摘要

### 5.2 注入优先级

每次聊天时：

- `identity_profile` 始终优先进入 Memory Summary
- 若存在多个主身份页，需按重要性 / ownerConfirmed 做明确排序

### 5.3 输出边界

注入应以压缩摘要为主，不应把整页全文直接塞进 prompt。

## 6. 实现步骤

### Step 1

为主身份页定义字段约定与摘要提取规则。

### Step 2

在 `wikiContext` 中加入 Identity Profile 的优先选取逻辑。

### Step 3

调整上下文构建，保证其在跨天时稳定进入 prompt。

## 7. 测试点

- 存在主身份页时，每轮对话上下文都能稳定命中
- 不存在主身份页时有明确兜底
- 普通 topic/person 页不会抢占主身份页优先级

## 8. 完成标准

- Identity 主身份页成为跨天稳定记忆主源
- Prompt 构建可稳定带入用户名字与关系摘要

## 9. 提交建议

`feat(agent): prioritize identity profile in memory injection`

