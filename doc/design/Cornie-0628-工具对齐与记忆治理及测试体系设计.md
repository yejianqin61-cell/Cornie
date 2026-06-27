# Cornie 0628 工具对齐、记忆治理与测试体系设计

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 0628 工具对齐、记忆治理与测试体系设计 |
| 文件名称 | Cornie-0628-工具对齐与记忆治理及测试体系设计.md |
| 产品名称 | Cornie（铃湾 / 小铃湾） |
| 文档类型 | 设计开发文档 |
| 文档版本 | V1.0 |
| 文档状态 | 生效中 |
| 编写日期 | 2026-06-28 |
| 适用对象 | 产品 / 研发 / 测试 |
| 关联文档 | Cornie-003-当前开发进度评估与下一阶段路线图.md、Cornie-011-当前开发进度复评-LLM-Wiki阶段.md、Cornie-0627-长期记忆LLM-Wiki正式设计.md |

## 2. 文档目标

本设计文档用于承接当前阶段最重要的三件事：

1. `7.1` 工具集与人类接口集对齐补完。
2. `7.2` 长期记忆治理机制正式设计。
3. `7.3` 系统级最小测试体系正式设计。

这份文档不是回顾文档，而是下一阶段可以直接依照开发的设计文档。

## 3. 当前真实现状判断

基于当前仓库代码，现状可以概括为：

- `ledger / todo / schedule / observation / memory / memory-wiki / system` 已经具备一定模型工具能力。
- `memory-wiki` 已经拥有较完整的人类后端接口。
- 前端当前公开 API 主要仍集中在 `diary / conversation / chatlog / confirmations`，并没有把全部后端可操作能力暴露给用户界面。
- 因此，当前最核心的矛盾不是“完全没有工具”，而是：

`模型工具集、后端接口集、前端可见能力 三者还没有真正对齐。`

## 4. 7.1 剩余工具集总表

### 4.1 设计原则

后续一切补齐工作都应遵循：

`模型工具集 = 人类接口集 = 前端可达能力集`

这里的“全等”不要求 UI 一开始就做得华丽，但至少要保证：

- 用户可以通过前端或等价的人类接口完成这些操作。
- 模型可以通过工具完成这些操作。
- 后端有统一服务层承接这些操作。

### 4.2 当前已具备的主要模型工具

#### ledger 域

已具备：

- `ledger.add_expense`
- `ledger.add_income`
- `ledger.get_entry`
- `ledger.list_today`
- `ledger.list_by_range`
- `ledger.update_entry`
- `ledger.delete_entry`
- `ledger_category.list_expense`
- `ledger_category.list_income`
- `ledger_category.create_expense`
- `ledger_category.create_income`
- `ledger_category.update`
- `ledger_category.delete`

#### todo 域

已具备：

- `todo.create`
- `todo.update`
- `todo.complete`
- `todo.delete`
- `todo.get`
- `todo.list_today`
- `todo.list_by_range`
- `todo_category.list`
- `todo_category.create`
- `todo_category.update`
- `todo_category.delete`

#### schedule 域

已具备：

- `schedule.create`
- `schedule.update`
- `schedule.cancel`
- `schedule.delete`
- `schedule.get`
- `schedule.list_today`
- `schedule.list_by_range`
- `schedule_category.list`
- `schedule_category.create`
- `schedule_category.update`
- `schedule_category.delete`

#### observation 域

已具备：

- `observation.add_note`
- `observation.update_note`
- `observation.delete_note`
- `observation.get`
- `observation.list_today`
- `observation.list_by_range`
- `observation.list_by_date`

#### memory 域

已具备：

- `memory.create`
- `memory.update`
- `memory.delete`
- `memory.list_active`
- `memory.search`

#### memory-wiki 域

已具备：

- `memory_wiki.get_page`
- `memory_wiki.list_pages`
- `memory_wiki.search_topic_index`
- `memory_wiki.list_topic_index`
- `memory_wiki.create_page`
- `memory_wiki.update_page`
- `memory_wiki.update_summary`
- `memory_wiki.update_aliases`
- `memory_wiki.set_status`
- `memory_wiki.set_importance`
- `memory_wiki.archive_page`
- `memory_wiki.restore_page`
- `memory_wiki.rollback_page`
- `memory_wiki.link_related_pages`
- `memory_wiki.merge_pages`
- `memory_index.update_aliases`
- `memory_index.link_page`

### 4.3 当前仍需补齐的剩余工具集

下面列的是下一阶段应优先补完的“剩余工具”。

#### A. ledger 域剩余工具

1. `ledger.list_by_category`
作用：按类目查看收支记录，便于模型补查和人类筛选。

2. `ledger.list_recent`
作用：快速查看最近 N 条记账记录，用于对话纠错与追问。

3. `ledger.list_by_id_batch`
作用：批量按 id 读取，便于确认流或批量修正。

4. `ledger_category.get`
作用：读取单个收支类目详情。

5. `ledger_category.list_all`
作用：统一列出收入和支出类目，供人类界面和模型统一查询。

6. `ledger_category.restore`
作用：恢复已停用类目。

7. `ledger_category.reorder`
作用：调整类目排序，保证人类界面和模型看到一致的优先顺序。

#### B. todo 域剩余工具

1. `todo.reopen`
作用：把已完成待办重新打开。

2. `todo.list_open`
作用：统一列出未完成待办。

3. `todo.list_completed`
作用：查看已完成待办。

4. `todo_category.get`
作用：读取单个待办类目详情。

5. `todo_category.restore`
作用：恢复停用类目。

6. `todo_category.reorder`
作用：类目排序调整。

#### C. schedule 域剩余工具

1. `schedule.reopen` 或 `schedule.restore`
作用：恢复已取消日程。

2. `schedule.list_upcoming`
作用：列出未来未完成日程。

3. `schedule.list_cancelled`
作用：列出已取消日程。

4. `schedule_category.get`
作用：读取单个日程类目详情。

5. `schedule_category.restore`
作用：恢复停用日程类目。

6. `schedule_category.reorder`
作用：类目排序调整。

#### D. memory-wiki 域剩余工具

1. `memory_wiki.get_versions`
作用：查看页面版本列表。

2. `memory_wiki.get_version_diff`
作用：查看两个版本差异。

3. `memory_wiki.list_audit_events`
作用：查看关键操作审计日志。

4. `memory_wiki.inspect_broken_links`
作用：主动巡检断链。

5. `memory_wiki.inspect_orphan_pages`
作用：主动巡检孤儿页。

6. `memory_wiki.delete_page`
作用：受保护删除页面。

7. `memory_index.get`
作用：读取单个主题索引详情的统一工具名。

8. `memory_index.list`
作用：列出全部主题索引项的统一工具名。

9. `memory_index.merge_topics`
作用：真正完成主题级合并。

10. `memory_index.unlink_page`
作用：解除主题与页面的关联。

#### E. 人类接口集剩余项

即使模型已有工具，也还需要补这些人类接口：

1. 收支记录查询、更新、删除的人类接口与前端入口。
2. 收支类目读取、恢复、排序的人类接口与前端入口。
3. 待办未完成列表、已完成列表、重新打开的人类接口与前端入口。
4. 日程未来列表、取消列表、恢复的人类接口与前端入口。
5. Memory Wiki 版本列表、差异查看、删除、审计日志、断链巡检、孤儿页巡检的人类接口与前端入口。
6. 主题索引详情、主题合并、解除关联的人类接口与前端入口。

### 4.4 剩余工具集的开发顺序

建议顺序：

1. `ledger / ledger_category`
2. `todo / todo_category`
3. `schedule / schedule_category`
4. `memory-wiki / memory-index` 治理补齐
5. 统一前端人类入口

## 5. 7.2 长期记忆治理设计方案

### 5.1 页面合并治理细则

页面合并不是简单拼接，而应分成三类：

#### 合并触发来源

页面合并候选的触发来源分为两类：

1. 对话内触发
含义：模型在人机对话过程中，发现两个页面高度疑似为同一主题，或发现新建页面应并入旧页面。

2. 巡检触发
含义：后台定时巡检或手动巡检时，发现重复页、影子页、别名重叠页或来源高度重叠页。

正式策略：

- 对话触发的高风险治理请求，可以在对话链路中提请确认。
- 巡检触发的治理请求，不耦合在人机对话场景里，不在下次聊天时批量弹出。
- 巡检触发的治理请求，统一进入 Memory Wiki 模块的“待审核区域”。

#### 巡检触发的待审核区域设计原则

巡检触发的治理建议应进入 Memory Wiki 模块的独立审核区，而不是打断聊天。

原因：

- 不污染人机对话体验。
- 不破坏陪伴感和自然聊天节奏。
- 用户可以在合适时间集中处理治理事务。
- 后续便于扩展成统一的治理工作台。

待审核区域至少应包含以下分区：

1. 合并候选
2. 冲突覆盖候选
3. 归档候选
4. 修复建议

每条待审核项至少展示：

- 候选类型
- 触发原因
- 涉及页面
- 证据摘要
- 创建时间
- 风险等级
- 操作按钮：查看详情 / 同意 / 拒绝 / 稍后处理

待审核区补充规则：

- 巡检任务只负责产出候选，不直接打断当前人机对话。
- 巡检发现的候选应写入独立待审核池，由 Memory Wiki 模块集中展示。
- 用户进入 Memory Wiki 模块时，可以主动查看并逐条处理这些候选。
- 稍后处理的候选保留在池中，不应在下一次聊天开始时强制弹出。
- 只有对话内即时触发、且确实阻塞当前回答的高风险治理事项，才允许走对话确认流。
- 前端需要为待审核池提供独立入口、未处理数量提示、分类筛选与逐条审核界面。
- 巡检候选的提醒方式应为异步通知，例如 Memory Wiki 入口角标、模块内通知条、待审核列表未读数，不应占用聊天弹窗通道。
- 聊天页最多只允许展示轻量提示，例如“记忆治理有 3 条待审核建议，可前往 Wiki 查看”，不承接逐条确认。

后续统一规则：

- 对话触发的治理请求：走对话确认流。
- 巡检触发的治理请求：进入 Memory Wiki 待审核区。
- 两者最终共用同一套治理执行与审计模型，但入口不同。

#### 一类：别名重复页合并

场景：

- “龙虾”页和“澳洲龙虾”页其实说的是同一主题。

合并规则：

1. 先由主题索引判定为重复候选。
2. 模型提出合并建议，不自动执行。
3. 人类确认后执行合并。
4. 目标页保留：
   - 主标题
   - 当前活跃摘要
   - 重要性最高值
5. 源页转为：
   - archived 状态
   - 标记 merged_into
6. 源页标题、别名并入目标页 aliases。
7. 来源引用、相关页、主题索引引用全部迁移。
8. 保留合并审计记录与可回滚版本。

#### 二类：信息互补页合并

场景：

- 同一主题被分散记录在两个页面里，但内容互补。

合并规则：

1. 保留一个主页面。
2. 摘要采用“人工确认后的重写摘要”，不做机械拼接。
3. 正文按“时间段 + 事实块”结构重新整理。
4. 冲突信息保留冲突标记，不强行抹平。

#### 三类：冲突覆盖页治理

场景：

- 旧页面说“喜欢甜食”，新页面说“现在明显不喜欢太甜”。

治理规则：

1. 不立即硬合并。
2. 先生成“冲突候选”。
3. 模型提议：
   - 覆盖旧记忆
   - 保留历史阶段
   - 拆成两个阶段事实
4. 由人类确认最终策略。

### 5.2 长期归档机制

归档不是删除，而是从“活跃层”转入“低频/归档层”。

#### 归档触发条件

1. 长时间未被提及。
2. 长时间未被命中检索。
3. 已被新页面或新事实覆盖。
4. 属于阶段性事件且阶段已经结束。
5. 用户手动要求归档。

#### 归档分层

建议分三层：

1. `active`
含义：主链默认可装载。

2. `inactive`
含义：不默认装载，但可被检索命中。

3. `archived`
含义：只在强相关检索或人工查看时使用。

#### 归档行为

归档后：

- 不再进入主链默认摘要。
- 仍保留主题索引引用。
- 保留来源引用、版本、审计历史。
- 支持恢复。

### 5.3 压缩机制

压缩的目标不是减少文件数，而是减少模型主链噪音。

#### 压缩对象

1. 同主题重复事实。
2. 连续几天的同类观察。
3. 低差异度的偏好描述。
4. 已完成阶段事件的长正文。

#### 压缩方式

1. 摘要压缩
把多条近似事实压缩成一条稳定摘要。

2. 时间块压缩
把连续时间上的同一主题整合成“阶段总结”。

3. 引用保留压缩
摘要被压缩，但来源引用全部保留，不丢证据链。

#### 压缩原则

- 压缩只改摘要层，不轻易丢原始正文。
- 压缩前后都保留版本快照。
- 压缩属于高风险治理动作，默认走确认流。

### 5.4 主题热度衰减策略

主题热度不是永久累加，而应衰减。

#### 热度来源

主题热度由以下信号共同组成：

1. 最近提及次数。
2. 提及时间新鲜度。
3. 是否进入长期记忆 active 页。
4. 是否被用户明确强调“重要”。
5. 是否近期被用于主链上下文装载。

#### 衰减机制

建议采用：

- 最近 7 天：高权重
- 8-30 天：中权重
- 31-90 天：低权重
- 90 天以上：显著衰减

#### 特殊豁免

以下主题不应简单按时间衰减：

- 明确长期偏好/厌恶
- 核心关系人
- 长期项目
- 持续性目标
- 用户手动置顶的重要主题

#### 热度用途

主题热度主要用于：

1. 上下文装载优先级。
2. 主题索引排序。
3. 合并候选排序。
4. 归档候选识别。

### 5.5 用户可见、可控的记忆编辑体验

这是长期记忆真正能长期使用的关键。

#### 用户可见能力

用户应能看到：

1. 当前有哪些记忆页面。
2. 每个页面的摘要、状态、重要性。
3. 页面来源引用。
4. 相关聊天记录日期。
5. 页面版本历史。
6. 页面最近是否被模型使用。

#### 用户可控能力

用户应能：

1. 手动编辑页面标题、摘要、正文、别名。
2. 修改页面重要性与状态。
3. 手动归档、恢复、删除。
4. 手动发起页面合并。
5. 查看并选择回滚版本。
6. 查看断链与孤儿页巡检结果。
7. 直接调整主题索引别名与关联。

#### 模型与人类的边界

建议边界如下：

1. 模型可以提议。
2. 模型可以执行低风险读操作。
3. 模型可以执行部分中风险写操作。
4. 高风险治理动作默认确认。
5. 用户拥有最终修正权和覆盖权。

## 6. 7.3 测试体系设计方案

### 6.1 设计目标

目标不是一开始就搭完整企业级测试平台，而是建立：

`可持续回归的最小系统级测试体系`

### 6.2 测试分层

建议分四层：

#### 第一层：纯函数/协议层测试

覆盖：

- JSON 协议解析
- JSON 修复重试逻辑
- 风险等级判定
- prompt 片段构建
- 上下文控长逻辑

目标：

- 快
- 稳
- 每次提交都能跑

#### 第二层：服务层测试

覆盖：

- ledger service
- todo service
- schedule service
- memory-wiki service
- topic index
- version store
- confirm service

目标：

- 验证业务规则
- 验证 CRUD 生命周期
- 验证归档与回滚语义

#### 第三层：工具与网关集成测试

覆盖：

- tool registry
- gateway 分发
- tool policy 判定
- confirm 恢复执行
- 工具结果封装

目标：

- 验证“模型发起 -> 工具执行 -> 结果回传”链路

#### 第四层：编排主链路集成测试

覆盖：

- conversation orchestrator
- 只读补查轮次
- 高风险确认流
- ask_back / deny / allow 分支
- 工具执行后 followup 回复生成

目标：

- 验证主链路不会轻易回归失效

### 6.3 本期必须补的测试主题

#### A. JSON 协议测试

至少补：

1. 正常 reply 解析。
2. 正常 tool_call 解析。
3. 非法 JSON 修复重试。
4. 字段缺失时的失败分支。

#### B. tool policy 测试

至少补：

1. low risk 直接放行。
2. medium risk 放行策略。
3. high risk 进入 confirm。
4. 模糊请求进入 ask_back。
5. 明显违规进入 deny。

#### C. orchestrator 测试

至少补：

1. 纯回复链路。
2. 单轮工具调用链路。
3. 只读补查链路。
4. 高风险确认链路。
5. 工具执行后 followup 链路。
6. 模型返回脏 JSON 的修复链路。

#### D. 业务 service 测试

至少补：

1. ledger 增删改查。
2. ledger_category 生命周期。
3. todo 生命周期。
4. todo_category 生命周期。
5. schedule 生命周期。
6. schedule_category 生命周期。
7. memory-wiki 页面生命周期。
8. topic index 生命周期。

#### E. 记忆治理测试

至少补：

1. 页面合并后来源迁移。
2. 版本回滚前后状态一致性。
3. 归档后不再默认进入主链。
4. 热度衰减排序逻辑。
5. 孤儿页与断链巡检输出。

### 6.4 测试资产组织建议

建议新增目录结构：

```text
tests/
  protocol/
  policy/
  services/
  tools/
  orchestrator/
  memory-governance/
fixtures/
  conversations/
  tool-calls/
  memory-wiki/
```

### 6.5 运行策略

建议把测试命令分成三档：

1. `npm run test:fast`
覆盖纯函数和关键 service。

2. `npm run test:integration`
覆盖 tools、gateway、orchestrator。

3. `npm run test:full`
覆盖全部测试与现有 verify 脚本。

### 6.6 现有 verify 脚本与正式测试的关系

现有 `verify:*` 不应被废弃。

建议定位为：

- `verify:*`：阶段验收与专项回归脚本
- `tests/*`：持续化、结构化测试体系

也就是说，后续不是替换，而是双轨并存：

1. `verify:*` 保留开发期验收价值。
2. `tests/*` 负责系统性回归保障。

## 7. 下一阶段开发建议

建议直接按下面顺序生成和执行任务：

1. 先做 `7.1`：
   - 补剩余工具集总表
   - 为 `ledger / todo / schedule / memory-wiki` 补齐缺失工具与接口

2. 再做 `7.2`：
   - 页面合并治理
   - 归档与压缩机制
   - 主题热度衰减
   - 记忆编辑体验

3. 最后做 `7.3`：
   - 建立 `tests/` 目录
   - 先补协议、policy、orchestrator 和核心 service 测试
   - 再把现有 verify 脚本与测试体系统一纳入脚本编排

## 8. 最终结论

当前阶段最重要的事已经不是继续扩更多“新概念”，而是：

`把工具集补齐，把记忆治理做稳，把测试体系立起来。`

这三件事一旦补上，Cornie 才会真正从“能跑的原型”走向“可持续迭代的产品基础设施”。

---

**文档结束**
