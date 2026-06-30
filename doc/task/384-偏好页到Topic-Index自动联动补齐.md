# 384 偏好页到 Topic Index 自动联动补齐

## 目标

补齐 `identity_preference` 页面与 `Topic Index` 的自动联动。  
当用户偏好页被创建或增量更新后，系统应自动生成或更新对应主题索引，便于后续按偏好主题进行日期定位、聊天回查与轻量召回。

## 设计依据

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- 第 8 节“页面结构与 Topic Index 的联动”
- 其中对偏好页的要求：
  - “对应若干偏好主题词”

## 当前缺口

- `identity_preference` 目前已支持：
  - 对话中抽取偏好候选
  - 创建 / 更新偏好页
  - `identity_profile <-> identity_preference` 双向关联
- 但尚未支持：
  - 偏好页自动创建 / 更新对应 Topic Index 项
  - 偏好主题的日期来源与聊天来源沉淀

## 本任务范围

1. 在偏好页创建 / 更新时自动补齐 Topic Index
2. 为偏好主题写入：
   - `keyword`
   - `aliases`
   - `dates`
   - `chatRefs`
   - `memoryPageIds`
3. 保持幂等，重复写入不重复追加

## 实现要求

1. 在 `electron/backend/identity/preferenceUpsert.js` 增加 Topic Index 联动函数
2. Topic 主关键字优先使用：
   - 偏好页 `title`
3. Topic aliases 可合并：
   - 偏好页 `title`
   - `triggerKeywords`
   - `preferenceType`
   - `stance`
4. 首次创建和后续更新都要自动联动
5. 不改变现有偏好页的抽取规则与写入门槛

## 验收标准

1. 偏好页首次创建后应自动生成对应 Topic
2. Topic 应链接到偏好页 pageId
3. Topic 应写入日期与聊天来源
4. 偏好页再次更新后，Topic 应增量补齐新来源
5. 重复执行相同消息时，Topic 的 `dates` / `chatRefs` / `memoryPageIds` 不应重复写入
6. 验证脚本通过
7. `npm run build` 通过
