# 385 性格侧写页到 Topic Index 轻索引联动补齐

## 目标

补齐 `identity_trait` 页面到 `Topic Index` 的轻索引联动。  
当性格 / 状态侧写页被创建或更新时，系统应自动留下可回查的轻量主题索引，便于后续按主题关键词定位相关日期、聊天来源和记忆页。

## 设计依据

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- 第 8 节“页面结构与 Topic Index 的联动”
- 其中对性格页的要求：
  - “通常不需要过多主题化”
  - “但可在重要关键词上留轻索引”

## 当前缺口

- `identity_trait` 目前已支持：
  - trait 候选抽取
  - 页面创建 / 更新
  - `identity_profile <-> identity_trait` 双向关联
- 但尚未支持：
  - trait 页自动创建 / 更新对应 Topic Index 项
  - trait 主题的日期来源与聊天来源沉淀

## 本任务范围

1. 在 trait 页创建 / 更新时自动补齐 Topic Index
2. 为 trait 主题写入：
   - `keyword`
   - `aliases`
   - `dates`
   - `chatRefs`
   - `memoryPageIds`
3. 保持“轻索引”原则：
   - 仅围绕 trait 标题与触发关键词联动
   - 不扩展复杂多主题图谱
4. 保持幂等，重复执行不重复追加

## 实现要求

1. 在 `electron/backend/identity/traitUpsert.js` 增加 Topic Index 联动函数
2. Topic 主关键字优先使用：
   - trait 页 `title`
3. Topic aliases 可合并：
   - trait 页 `title`
   - `triggerKeywords`
   - `traitType`
4. 首次创建和后续更新都要自动联动
5. 不改变现有 trait 抽取门槛与治理策略

## 验收标准

1. trait 页首次创建后应自动生成对应 Topic
2. Topic 应链接到 trait 页 pageId
3. Topic 应写入日期与聊天来源
4. trait 页再次更新后，Topic 应增量补齐新来源
5. 重复执行相同消息时，Topic 的 `dates` / `chatRefs` / `memoryPageIds` 不应重复写入
6. 验证脚本通过
7. `npm run build` 通过
