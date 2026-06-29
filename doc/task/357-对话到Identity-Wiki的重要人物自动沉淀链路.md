# 357-对话到Identity-Wiki的重要人物自动沉淀链路

## 1. 任务目标

建立“对话内容 -> `identity_person`”的自动沉淀主链路，让用户在聊天中反复提及、情绪权重高、关系明确的重要人物，能够稳定写入长期记忆 Wiki，而不是只停留在当天聊天或观察日志里。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/agent/orchestrator.js`
- `electron/backend/identity/`
- `electron/backend/memory-wiki/`
- `scripts/`

## 4. 当前问题

当前系统已经支持：

- `identity_profile` 自动沉淀
- `identity_preference` 自动沉淀
- `identity_trait` 自动沉淀

但还没有“重要人物页”的自动沉淀链路，导致：

- 用户提到重要人物后，第二天不一定还能稳定记得
- 人物关系、身份、共同经历仍容易散落在聊天和观察日志里
- `identity_person` 主要还是手工创建，而不是顺着真实对话自然生长

## 5. 目标设计

- 从对话中提取高确定性的重要人物候选
- 仅对高价值场景自动创建/更新 `identity_person`
- 初期优先沉淀这些字段：
  - `personName`
  - `relationshipToUser`
  - `timelineSummary`
  - `sharedExperienceSummary`
  - `emotionalWeight`
  - `lastMentionedAt`
- 自动补来源引用 `sourceRefs`
- 如存在主身份页，则自动建立 `identity_profile -> identity_person` 关联

## 6. 触发边界

建议先只覆盖高确定性场景：

- 用户明确说“我的初恋名字叫 X”
- 用户明确说“X 是我的初恋 / 家人 / 朋友 / 同学”
- 用户明确描述与该人物的关键共同经历

暂不覆盖：

- 只有模糊代词的表达
- 单次低价值路人提及
- 仅凭模型猜测的人物关系

## 7. 实现步骤

### Step 1

新增 `identity_person` 候选提取与 upsert 模块。

### Step 2

按名字匹配已有人物页，命中则增量更新，未命中则创建新页。

### Step 3

补 `lastMentionedAt`、来源引用和默认重要性策略。

### Step 4

若存在主身份页，则补相关页面关联。

### Step 5

在 orchestrator 对话收尾阶段接入自动沉淀调用。

## 8. 测试点

- 首次提及重要人物时可创建 `identity_person`
- 重复提及时会更新 `lastMentionedAt` 与来源，而不是重复建页
- 若存在主身份页，可自动补关联
- 低确定性普通人名不会误创建人物页

## 9. 完成标准

- 重要人物可以从聊天中稳定沉淀到长期记忆 Wiki
- 跨天对话时能通过人物页参与召回

## 10. 提交建议

`feat(identity): add conversation-driven person upsert flow`
