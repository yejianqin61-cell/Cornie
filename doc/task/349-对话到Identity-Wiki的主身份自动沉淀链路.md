# 349-对话到Identity-Wiki的主身份自动沉淀链路

## 1. 任务目标

建立“对话内容 -> Identity Wiki”的最小主链路，优先解决用户名字、用户与 Cornie 的关系这两类最高优先级 Identity 记忆，避免继续只在当天聊天里记住、跨天就丢失。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/agent/orchestrator.js`
- `electron/backend/agent/contextBuilder.js`
- `electron/backend/memory-wiki/service.js`
- `electron/backend/memory-wiki/`
- 必要时新增 `identity` 写入辅助模块

## 4. 当前问题

当前主身份页虽然可以人工创建，但对话后不会稳定自动沉淀到 Wiki。

这意味着：

- 用户说“我叫叶健钦”，第二天不一定记得
- 用户说“你是我女儿/我是你爸爸/我是你的创造者”，第二天不一定记得
- 主身份页缺乏自动维护能力

## 5. 目标设计

先只做最小高价值自动沉淀：

- 名字类表述
- 称呼偏好类表述
- 用户与 Cornie 的关系类表述

建议策略：

- 对明显高确定性表达做 Identity Profile upsert
- 高风险冲突更新走治理候选或确认流
- 写入后主身份页可在下一轮和跨天对话稳定注入

## 6. 实现步骤

### Step 1

设计主身份候选提取函数，识别高确定性表达。

### Step 2

实现 `identity_profile` 的 upsert 辅助逻辑。

### Step 3

在 orchestrator 对话完成后接入最小自动沉淀链路。

### Step 4

对冲突更新增加保守策略，不直接覆盖高价值字段。

## 7. 测试点

- 对话中声明名字后可自动写入主身份页
- 对话中声明与 Cornie 的关系后可自动写入主身份页
- 同值重复写入不会制造噪音更新
- 冲突更新不会直接无声覆盖

## 8. 完成标准

- 主身份最小自动沉淀链路可用
- 名字与关系类记忆从“当天记住”升级为“跨天稳定”

## 9. 提交建议

`feat(identity): add conversation-driven profile upsert flow`
