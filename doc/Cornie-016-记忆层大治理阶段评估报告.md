# Cornie-016-记忆层大治理阶段评估报告

## 1. 文档定位

本文档用于对本轮“记忆层大治理”目标进行阶段性评估。  
评估范围聚焦于以下三份设计稿对应的实际落地情况：

1. `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
2. `doc/design/Cornie-0630-聊天记录存储与历史归档改造方案.md`
3. `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

本文档重点回答：

1. 本轮记忆层治理已经实际完成了什么。
2. 当前记忆层主链是否已经成立。
3. 各子模块完成度如何。
4. 还剩哪些缺口和风险。
5. 下一阶段最建议继续推进什么。

---

## 2. 总体结论

本轮记忆层治理不是单点功能开发，而是一次中大型主链收口工程。  
从当前代码、专项脚本、总验收入口和提交结果来看，本轮目标已经达到预期主目标，整体完成度评估为：

- **总体完成度：85% - 90%**

当前最重要的结论有三条：

1. **长期记忆主源已经基本统一到 Memory Wiki**
2. **Identity 结构化记忆主链已经成形**
3. **记忆主链已经具备专项回归验收能力**

这意味着 Cornie 的记忆系统已经从“很多零散能力并存”推进到“主链明确、边界明确、可验证”的阶段。

---

## 3. 本轮已完成的关键改动

### 3.1 观察日志边界收口

本轮已完成观察日志的主链职责收口：

- 观察日志被明确为**按天归档的事实层**
- 聊天主链默认只注入少量当日观察摘要
- 历史观察日志不再全量注入 prompt
- 历史观察改为通过 recall / tool 按需补查
- 同日重复事实支持去重与增量合并

对应成果主要体现在：

- `80ebd38 refactor(observation): enforce archive and prompt loading boundaries`
- `scripts/verify-task398-observation-prompt-loading-boundaries.mjs`

这一步完成后，观察日志终于不再和长期记忆、聊天原文混层。

### 3.2 Identity 主链成形

本轮已将 Identity 从概念设计推进为正式可用的结构化记忆层。  
当前已经具备以下 4 类正式实体：

1. `identity_profile`
2. `identity_person`
3. `identity_preference`
4. `identity_trait`

并已经完成：

- 主身份页稳定注入
- 重要人物页条件召回
- 偏好页条件召回
- trait 页谨慎写入与情绪场景召回

对应成果主要体现在：

- `0c43f71 feat(identity): finalize stable injection and conditional recall matrix`
- `9ba43f3 feat(identity-profile): complete structured fields and conflict governance`
- `0d6f2d0 test(identity-person): add rules and source-link coverage`
- `8dd9048 feat(identity-preference): finalize evidence buildup and conditional injection`
- `5ee0e48 feat(identity-trait): tighten cautious writes and review gating`

### 3.3 主身份写入与冲突治理

本轮已经把 `identity_profile` 的字段分成不同风险等级处理：

- 高风险字段冲突需谨慎治理
  - `userName`
  - `preferredName`
  - `cornieRelationship`
- 软字段允许保守合并
  - `identitySummary`
  - `lifeStageSummary`
  - `currentFocus`
  - `stressors`
  - `communicationPreference`

这一步的意义在于：

- 不会因为一句新话就轻易推翻稳定身份信息
- 也不会因为过于保守而丢失阶段画像类补充信息

### 3.4 人物页沉淀与来源补链

重要人物已经不再只是聊天里的一句名字，而是开始具备独立页承载能力。  
当前已落地：

- 人物页结构化沉淀
- 与聊天 / 观察日志来源的补链
- 与 Topic Index 的联动基础

这使“钟奕菲”这类长期高权重人物，开始具备跨天稳定召回能力。

### 3.5 聊天记录主链边界增强

聊天记录模块本轮已明显成熟，关键变化包括：

- 聊天记录按日归档能力持续可用
- 单日长会话支持分页读取边界
- 历史聊天改为 recall / search / paging 按需读取
- 不再默认把大量历史聊天整包带入 prompt
- 聊天 / Observation / Topic / Identity 之间开始能互相回查

对应成果主要体现在：

- `658f0be refactor(chatlog): switch runtime driver to better-sqlite3`
- `a0de535 feat(chatlog): deepen history query and paging contracts`
- `f57268f test(chatlog): add long-session history boundary coverage`
- `52005a1 test(memory-trace): add cross-source recall closure coverage`

### 3.6 旧 memory_entries 主链退场

这是本轮极其关键的一步。  
当前旧 `memory_entries` 已经基本退为兼容层，而非正式长期记忆主链。

当前状态为：

- runtime 不再注册 `memory.*` legacy 工具
- 策略层会 deny legacy memory 工具调用
- 主链上下文使用的是 `wikiContext.memorySummary`
- 对话后的正式长期记忆沉淀走 Memory Wiki / Identity 链路
- 旧 `memory_entries` 仅保留为兼容数据层

对应成果主要体现在：

- `a45e02d refactor(memory): retire legacy memory entries from primary chain`
- `scripts/verify-task406-legacy-memory-primary-chain-retirement.mjs`

### 3.7 主链总回归验收入口补齐

本轮最终补上了主链级总验收脚本，能统一跑通以下能力：

- 身份记忆跨天沉淀
- 人物页沉淀
- 观察日志 prompt 装载边界
- Identity 默认注入与条件召回
- 聊天记录分页边界
- 聊天 / Observation / Topic / Identity 跨源回查
- 旧 `memory_entries` 退场验证

对应成果主要体现在：

- `047fa30 test(memory): add cross-day memory regression coverage`
- `scripts/verify-task407-memory-primary-chain-regression.mjs`

---

## 4. 各模块完成度评估

### 4.1 观察日志

- **完成度：90%**

已完成：

- 按天归档
- 事实层定位
- prompt 默认轻注入
- 历史观察 recall 边界
- 同日去重与增量合并

剩余主要问题：

- 人类侧整理体验仍可继续产品化
- 长期运行后的压缩治理策略还可继续增强

### 4.2 Identity 主身份

- **完成度：90%**

已完成：

- 用户名
- 称呼
- 与 Cornie 的关系
- 阶段画像
- 软字段保守合并
- 默认稳定注入

剩余主要问题：

- 人类侧编辑治理体验还未完全产品化

### 4.3 重要人物页

- **完成度：85%**

已完成：

- 独立人物页模型
- 来源补链
- 条件召回
- Topic 联动基础

剩余主要问题：

- 更精细的人物关系治理工作台仍可继续补

### 4.4 偏好页与 Trait 页

- **完成度：80% - 85%**

已完成：

- 偏好页条件命中召回
- 关键词双向匹配增强
- trait 谨慎写入
- 情绪 / 压力场景条件召回

剩余主要问题：

- 长期运营下的进一步去噪与治理还可继续优化

### 4.5 聊天记录与历史回查

- **完成度：85%**

已完成：

- better-sqlite3 驱动切换
- 长会话分页边界
- 跨日消息片段检索
- 主链上下文不膨胀
- 记忆来源回查补齐

剩余主要问题：

- 前端历史阅读体验仍可继续优化
- 人类视角的历史工作台产品性还可增强

### 4.6 长期记忆主源统一

- **完成度：85%**

已完成：

- Memory Wiki 成为正式主源
- legacy memory runtime 退场
- legacy policy deny
- 主链上下文不再依赖旧摘要

剩余主要问题：

- 旧历史兼容数据仍保留
- 兼容层彻底删除与迁移策略尚未进入最终阶段

### 4.7 测试与验收体系

- **完成度：88%**

已完成：

- 各专项脚本拆分
- 主链总回归入口
- 构建验证
- 主链关键链路脚本化证明

剩余主要问题：

- 真实多天连续使用场景仍需要更长期人工验收

---

## 5. 本轮最重要的实现价值

如果从产品架构角度总结，本轮最重要的成果不是“多了几个模块”，而是：

> Cornie 的记忆系统第一次真正拥有了清晰主链。

这条主链已经开始回答以下问题：

1. 什么信息该记。
2. 记到哪里。
3. 什么默认注入。
4. 什么按需召回。
5. 什么应该停留在事实层。
6. 什么才属于跨天稳定身份记忆。
7. 怎么证明它没有退化。

这意味着系统已经从“能记一些东西”走向“知道如何长期记住一个人”。

---

## 6. 当前仍存在的缺口与风险

### 6.1 旧兼容层尚未彻底删除

虽然旧 `memory_entries` 已退出主链，但兼容数据层仍保留。  
这对当前阶段是合理的，但从长期看仍存在：

- 历史数据双轨理解成本
- 新成员误读 legacy 层的风险

### 6.2 人类侧治理体验未完全成熟

本轮主要收的是后端主链和模型主链。  
人类可见、可改、可审、可回溯的记忆工作台仍未达到最终产品态。

### 6.3 Self Reflection 尚未真正进入

当前长期记忆主线仍主要聚焦在 Identity。  
更高层的长期阶段反思、自我反思、成长理解尚未纳入当前实现主线。

### 6.4 长期真实使用稳定性仍需观察

虽然脚本层已经较完整，但“连续多天真实聊天后是否稳定不漂移”，还需要更多真实使用验证。

---

## 7. 下一阶段建议

### 7.1 第一优先级：做人类侧记忆治理工作台收口

建议优先推进：

- Identity 页面的人类可见、可改、可删、可查来源
- 重要人物页的人类治理体验
- Topic / Observation / Memory Wiki 的联动阅读入口
- 待审核治理池的人类操作闭环

原因：

- 当前模型侧主链已经成形
- 下一步最缺的是“人类可控”

### 7.2 第二优先级：做真实多天记忆验收

建议补一轮真实场景连续验证：

- 多天名字记忆
- 多天关系记忆
- 多天重要人物召回
- 多天观察日志到长期记忆升级

原因：

- 当前脚本证明了规则
- 但真实连续使用仍需要体验层验证

### 7.3 第三优先级：设计旧兼容数据迁移与清理策略

建议逐步明确：

- 旧 `memory_entries` 是否迁移
- 如何迁移到 Wiki / Identity
- 何时彻底移除兼容层

原因：

- 当前主链已完成退场
- 下一步该处理历史资产和长期维护成本

### 7.4 暂缓项建议

以下内容建议暂缓，不要在当前阶段抢主线：

- Self Reflection 大规模建设
- 更复杂的长期反思自动生成
- 更重型 RAG 扩展

原因：

- 当前 Identity 主线刚收口
- 再扩更高层能力，容易再次把边界搞乱

---

## 8. 阶段判断

本轮记忆层大治理可以判断为：

- **主目标已完成**
- **主链已成形**
- **专项验收已具备**
- **可以进入下一阶段的人类治理与长期运营完善**

但同时也要保持清醒：

- 当前不是“记忆层已经最终完成”
- 而是“记忆层第一次进入可长期维护、可继续产品化的状态”

---

## 9. 当前结论

本轮记忆层改动的最终评价是：

1. 它成功解决了“昨天记得，今天忘了”的主链级问题。
2. 它成功把长期记忆主源统一到 Memory Wiki。
3. 它成功让 Identity 结构化记忆真正开始工作。
4. 它成功让观察日志、聊天记录、长期记忆之间的边界清晰下来。
5. 它成功建立了后续可以持续复跑的主链验收基线。

因此，这轮工作已经不是“补几个功能点”，而是完成了一次真正有价值的系统治理收口。
