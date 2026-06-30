# 401-Identity Person人物页沉淀规则与来源补链收口

## 1. 任务目标

根据 `0630` 设计稿，把重要人物页从“能创建”推进到“规则清晰、来源可追、与主身份及 Topic 联动完整”。

---

## 2. 任务来源

- `Cornie-0630-Identity记忆实体模型与页面结构设计.md` 第 7、8、9、10、11、13 节
- `Cornie-0630-记忆层改进治理总纲-第一版.md` 第 5、6、7、8、9、10 节

---

## 3. 目标设计

### 3.1 人物页结构完整

确保 `identity_person` 正式承载：

- `personName`
- `relationshipToUser`
- `roleSummary`
- `personalitySummary`
- `sharedExperienceSummary`
- `meaningToUser`
- `timelineSummary`
- `emotionalWeight`
- `firstKnownPeriod`
- `lastMentionedAt`

### 3.2 人物页创建门槛

只在以下场景创建或更新人物页：

- 用户明确说出人物姓名
- 用户明确给出关系定义
- 用户反复提及该人物
- 该人物有明显情感权重或人生叙事权重

普通路人、模糊代词、一次性低价值提及不得误建人物页。

### 3.3 来源补链

人物页必须支持：

- 聊天来源引用
- 观察日志来源引用
- Topic Index 关联

### 3.4 关系冲突治理

当同一个人物出现关系冲突时：

- 不直接覆盖
- 进入治理审核
- 保留来源证据

### 3.5 主身份与人物联动

要求：

- `identity_profile -> identity_person` 自动建立 related link
- 人物页能反向关联主身份页

---

## 4. 实施点

- `electron/backend/identity/personUpsert.js`
- `electron/backend/agent/wikiContext.js`
- `electron/backend/memory-wiki/service.js`
- `electron/backend/observation/wikiUpgradeApply.js`

---

## 5. 完成标准

- 高确定性重要人物可稳定沉淀为独立页面
- 人物页具备聊天/观察/主题三类来源关联
- 关系冲突进入治理，不静默覆盖
- 有专项脚本覆盖创建、更新、冲突、来源补链

---

## 6. 提交建议

`feat(identity-person): finalize entity rules and source linking`
