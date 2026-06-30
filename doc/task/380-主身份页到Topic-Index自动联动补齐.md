# 380-主身份页到Topic-Index自动联动补齐

## 1. 目标

根据 `Cornie-0630-Identity记忆实体模型与页面结构设计.md` 中“主身份页常驻一个主索引项，例如用户名字、昵称、称呼”的要求，补齐 `identity_profile` 与 `Topic Index` 的自动联动主链，让主身份页在自动沉淀后，同时形成可检索、可回溯、可跨天召回的身份主题索引项。

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 2. 涉及范围

- `electron/backend/identity/profileUpsert.js`
- `electron/backend/memory-wiki/topicIndex.js`
- `scripts/`

## 3. 背景

当前系统已经支持：

- 主身份页从对话中自动沉淀到 `identity_profile`
- 主身份页进入默认稳定注入
- 主身份冲突进入治理候选池

但还缺一条重要链路：

- `identity_profile` 没有自动生成对应 Topic Index 项
- 用户名字、偏好称呼、身份称谓没有自动进入 Topic 索引层
- 后续按“名字 / 称呼 / 身份锚点”检索时，Topic 层不能稳定承担快速定位入口

这和 `0630 Identity` 设计稿里的“主身份页应常驻一个主索引项”还不一致。

## 4. 需求拆解

### 4.1 创建主身份页时自动联动 Topic

当 `identity_profile` 首次创建成功后，应自动：

- 以 `userName` 作为主 keyword
- 以 `preferredName`、页面标题、aliases 作为 aliases
- 链接 `memoryPageIds`
- 写入当天 `date`
- 写入 `chatRefs`
- 同步 `importance`

### 4.2 更新主身份页时增量补链 Topic

当主身份页后续被补充更新时，应自动：

- 补充新的 `date`
- 补充新的 `chatRef`
- 补充新的 `preferredName` / aliases
- 保持 `memoryPageIds` 持续包含当前主身份页
- 更新 `lastMentionedAt`

### 4.3 保持幂等

自动联动必须避免脏写：

- 同一天重复写入不应重复 `date`
- 同一条消息不应重复进入 `chatRefs`
- 同一页面不应重复进入 `memoryPageIds`

## 5. 实现要求

### 5.1 新增主身份 Topic 联动帮助函数

在 `profileUpsert` 中封装专门的 Topic 补链逻辑，避免主流程散落过多索引细节。

### 5.2 优先使用用户名字作为 Topic 主键

规则建议：

- `keyword = userName`
- `normalizedKey = userName.toLowerCase()`
- `aliases = userName + preferredName + title + 页面 aliases` 去重合并

### 5.3 来源链路要求

至少补齐：

- `dates`
- `chatRefs`
- `memoryPageIds`

让系统后续可以通过名字或称呼，快速回查主身份页与相关日期来源。

## 6. 验收标准

- 首次主身份沉淀时会自动生成对应 Topic
- 后续补充称呼或身份信息时会增量更新 Topic
- Topic 中能看到：
  - `keyword`
  - `aliases`
  - `dates`
  - `chatRefs`
  - `memoryPageIds`
- 重复执行不产生重复数据
- 补一份可执行验证脚本
- `npm run build` 通过

## 7. 建议提交信息

`feat(identity): auto-link profile pages into topic index`
