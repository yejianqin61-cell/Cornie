# Cornie 记忆层改进计划

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 记忆层改进计划 |
| 文件名称 | Cornie-018-记忆层改进计划.md |
| 产品名称 | Cornie（铃湾 / 小铃湾） |
| 文档编号 | Cornie-018 |
| 文档类型 | 改进计划 / 排期规划 |
| 文档版本 | V1.0 |
| 文档状态 | 生效中 |
| 编写日期 | 2026-08-20 |
| 适用对象 | 产品 / 研发 / 测试 / 项目管理 |
| 上游文档 | `doc/Cornie-017-记忆层后端大治理完成度与前端对齐分析报告.md`、`doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md`、`doc/design/Cornie-0628-记忆层总体架构设计.md`、`doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md` |
| 下游文档 | 各 Phase 对应任务文档（`doc/task/`） |
| 关联规范 | `criterion/Cornie-doc文档规范.md`、`criterion/Cornie-backend-api规范.md`、`criterion/Cornie-commit-message规范.md` |
| 存放目录 | `doc/` |

### 1.1 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
| ---- | ---- | ------ | -------- |
| V1.0 | 2026-08-20 | 叶健钦 / AI | 基于 Cornie-017 与记忆层三方审查（主评估 + 两个独立后端审查）结果，形成缺陷清单、改进方案与 Phase 排期 |
| V1.1 | 2026-08-20 | 叶健钦 / AI | 新增最高优先级缺陷 D-18（记忆决策权在后端正则，LLM 被排除）与改进项 I-18（记忆提炼轮次，LLM 决策化改造）；新增 Phase 0 排期并顺延原 Phase 编号；更新 I-13 与验证体系、风险、结论 |

---

## 2. 文档目的与评估依据

### 2.1 文档目的

本计划基于对 Cornie 记忆层的完整评估，输出：

1. 当前记忆层的缺陷清单（含影响与证据）。
2. 每项缺陷的具体改进实现概述。
3. 按重要性分 Phase 的排期与验收方式。

### 2.2 评估结论回顾

对记忆层的总体评估结论：

- **设计思路：优秀（8.5/10）**——"观察日志=事实层 / Cornie 日记=关怀层 / Memory Wiki=稳定层"的三层记忆观与 6 层架构（入口 / API-Gateway / 服务 / 治理 / 消费 / 存储）立得住，"模型工具集=人类接口集"、克制消费、治理闭环三条原则正确。
- **后端实现：底座扎实**——存储层 78 / 服务层 75 / 版本层 55 / 治理层 68；Identity 沉淀 75 / 观察日志 70 / 聊天记录 80 / 上下文注入 85。
- **最大结构性缺口**：memory-wiki 的 30+ 个模型工具（`memory_wiki.*` / `memory_index.*` / `memory_governance.*`）已定义、策略已写，但**运行时从未注册**，模型侧拿不到任何记忆工具，policy 层相应规则不可达，设计核心原则"模型工具集=人类接口集"未落地。
- **前端对齐：50%-65%**——普通用户长期记忆 Wiki 的增删改查尚未产品化收口。

### 2.3 评估依据（三方一致）

| 来源 | 内容 |
| --- | --- |
| Cornie-017 | 记忆层后端大治理完成度与前端对齐分析报告（2026-06-30） |
| 审查一（后端实现） | `memory-wiki/*`、`memory/*`、`db.js`、`server.js` 全量代码审查 |
| 审查二（联动链路） | `identity/*`、`observation/*`、`chatlog/*`、`agent/*` 全量代码审查 |
| 一手验证 | 实际数据（`data/memory-wiki/`）、git 状态、运行时注册表核对 |

---

## 3. 当前缺陷清单

### 3.1 缺陷总览

| 编号 | 缺陷 | 严重度 | 影响 |
| --- | --- | --- | --- |
| D-18 | 记忆决策权在后端正则，LLM 被排除 | **P0** | 违背设计核心原则"是否计入记忆由 LLM 决定"；观察日志=聊天流水账；正则误提取（"啥名字啊"案例）已造成脏数据 |
| D-01 | memory-wiki 模型工具层未接线 | **P0** | 模型无法主动查询/修改/治理记忆 Wiki；"工具集=接口集"原则失效；policy 记忆规则为死代码 |
| D-02 | 旧 person 页面残留双轨 | **P0** | `pages/people/钟奕菲.md`（旧 person）与 `pages/identity/people/钟奕菲.md`（identity_person）并存，页面级重复 |
| D-03 | 普通用户前端记忆 Wiki 增删改查未收口 | **P0** | 新建/删除入口不完整、详情页偏基础文本编辑、identity 类型差异无表达（Cornie-017 已详述） |
| D-04 | 版本层无 diff 算法、无保留上限 | P1 | 全量快照无限膨胀；diff 仅返回布尔标志+全量正文，无法做字段级比对 |
| D-05 | 治理状态机无转移校验 | P1 | `updateStatus` 任意互转；deferred 无复活机制，状态语义不可信 |
| D-06 | 巡检重复入队 + 双重全量扫描 | P1 | 同一问题反复入队产生噪音治理请求；O(2N) 全量读文件 |
| D-07 | 观察日志压缩候选死胡同 | P1 | 压缩候选入队但无 apply 消费端，治理动作悬空 |
| D-08 | JSON 索引无锁整文件重写 | P1 | 4 个索引 read-modify-write 无锁，并发写丢更新 |
| D-09 | `listSummaries` N+1 读页、无分页 | P2 | 页面增长后列表加载性能恶化 |
| D-10 | 来源追溯/巡检逐 chatRef 查询无缓存 | P2 | 每个 chatRef 单独查一次 `getMessagesByDate` |
| D-11 | delete/merge 不回写索引 | P1 | 产生孤儿引用（topicIndex、对端 relatedPageIds），靠巡检兜底 |
| D-12 | 每轮对话 6 次记忆写入 + 全量上下文构建 | P2 | 每轮对话无条件跑 observation + 4 个 identity upsert + 完整 wiki 上下文装载 |
| D-13 | 死代码残留 | P2 | `observation/wikiLink.js`、`observation/topicLink.js`、`chatlog/memoryLink.js`、`chatlog/topicLink.js` 零引用；`createBetterSqlite3ChatlogRepositorySkeleton` 死骨架 |
| D-14 | 测试覆盖薄弱 | P1 | service.js（1085 行）仅 2 个顺序用例；治理/版本/巡检边界无回归测试；工具接线无集成验证 |
| D-15 | 双引擎读写并存 | P2 | 聊天记录写走 sql.js、读走 better-sqlite3，行为一致性风险 |
| D-16 | 数据细节：slug 误提取残留 | P2 | 主身份页 slug 为"啥名字啊"（title 已修正为"叶健钦"但 slug/pageId 未修） |
| D-17 | 旧 `memory_entries` 表无退役计划 | P3 | db.js 中表与 CRUD 永久保留，无迁移/清理时间点 |

### 3.2 缺陷详述

#### D-18 记忆决策权在后端正则（严重度最高，设计原则违背）

**现状**：当前"是否计入记忆、记什么内容"的判定 100% 由后端硬编码规则完成，LLM 完全被排除在决策之外：

| 模块 | 判定函数 | 规则形态 | 决策内容 |
| --- | --- | --- | --- |
| `identity/profileUpsert.js` | `extractUserName` | 3 条正则 + 黑名单 | 是否记名字、记什么 |
| | `extractCornieRelationship` | 5 条写死关系正则 | 关系定义 |
| | `detectLifeStageSummary` 等 4 个 | 关键词布尔组合 → 写死文案 | 阶段/关注点/压力/沟通偏好 |
| `identity/personUpsert.js` | `extractPersonalitySummary` 等 5 个 | 正则 | 人物性格/意义/经历/时间线 |
| `identity/preferenceUpsert.js` | `guessPreferenceType` | 4 组关键词分类 | 偏好类型与内容 |
| `identity/traitUpsert.js` | `buildTraitPatterns` | 3 个写死性格模式（短语表） | 是否沉淀性格 trait |
| `observation/service.js` | `shouldRecordObservation` | **18 个关键词 + 文本长度≥24 即写** | 是否记观察日志 |
| | `deriveConversationObservation` | 内容=`主人:{原话}\n铃湾:{原话}` 纯流水账 | 记什么内容 |
| `observation/wikiUpgrade.js` | `extract*Candidate` | 复用同一套正则 | 是否升级为记忆候选 |

**与设计哲学的矛盾**：`Cornie-0627 §5.3` 与 `Cornie-0628 §2.2` 明确规定"**模型提出**写入或合并请求 → 策略层判定风险 → 必要时进入确认流 → 确认后才执行真正写入"，即**是否计入记忆由 LLM 决定、后端执行**。而实际实现是每轮对话结束后后端**无条件**运行正则链路。讽刺的是：设计哲学要求的"LLM 提议通道"（`memory_wiki.*` 工具，见 D-01）恰好未接线，而设计哲学在 `0628 §12.1` 明确自认偏差的"后端启发式流水账"（观察日志=聊天原文拼接）恰好是当前唯一在跑的通道——**该偏差在 2026-08 仍未修复**。

**影响**：
1. 观察日志退化为聊天流水账（内容=主人原话+铃湾原话），违背"事实层、低噪声、按需记录"。
2. 正则误提取已造成真实脏数据：主身份页 slug 为"啥名字啊"（"我叫啥名字啊"被 `/我叫([^\s，。！？；,!?]{1,24})/` 捕获，"啊"不在分隔符集内）；治理队列中已出现被人工 rejected 的同类错误候选。
3. 规则写死（5 条关系、3 个 trait、3 组关键词轴）无法覆盖真实对话的语义多样性，"没匹配到就不记"与"碰巧匹配就乱记"并存。
4. 每轮对话无条件运行 6 次记忆 IO（与 D-12 叠加）。

**证据**：identity 四文件共 67 处正则/模式调用；`shouldRecordObservation` 关键词表与长度阈值；`deriveConversationObservation` 原样拼接；`data/memory-wiki/pages/identity/profiles/啥名字啊.md` 真实数据；`review-queue.json` 中被 rejected 的"啥名字啊"候选。

#### D-01 记忆工具层未接线

**现状**：`electron/backend/memory-wiki/tools.js` 定义了 `registerMemoryWikiTools`（33 个工具：`memory_wiki.get_page` / `list_pages` / `search_topic_index` / `create_page` / `merge_pages` / `rollback_page` / `archive_page` / `memory_governance.*` 等）；`policy/rules.js`（第 503-570 行）已为这些工具写了完整的 allow/confirm 策略与确认文案。但 `server.js` 仅注册了 ledger / todo / schedule / observation / system 五类工具，**全仓库对 `registerMemoryWikiTools` 零调用**。

**影响链**：`contextBuilder.summarizeTools()` 基于 `listTools()` 生成工具摘要 → 模型在真实对话中看不到任何记忆工具 → policy 层记忆规则不可达 → "模型工具集=人类接口集"运行时失效。记忆写入只能靠 orchestrator 硬编码的对话后自动沉淀，模型无法主动补查记忆详情、提议修改、合并或回滚。

**证据**：grep `registerMemoryWikiTools` 全仓库无结果；`server.js` 104-108 行仅注册 5 类工具；`policy/rules.js` 503+ 行引用工具名；M5/M6 验收脚本（task070-077）只验证"定义存在"未验证运行时注册。

#### D-02 旧 person 页面双轨

**现状**：`data/memory-wiki/pages/people/钟奕菲.md`（`page_type: person`，旧模型）与 `data/memory-wiki/pages/identity/people/钟奕菲.md`（`page_type: identity_person`，新模型）并存。

**影响**：页面级重复；合并治理候选池存在的意义被验证，但数据迁移未完成；前端可能展示两条"钟奕菲"。

#### D-03 前端增删改查未收口

**现状**：`ObserveMemoryHome.vue` 已有"新建记忆"入口、`MemoryPageDetail.vue`（635 行）含创建/删除/来源追溯雏形，但删除流程、页面类型差异表达（profile/person/preference/trait 模板）、确认状态展示、来源可读化均未收口。

**影响**：用户感知不到后端强能力，易把长期记忆当普通文本笔记（Cornie-017 第 7.2 节）。

#### D-04 版本层薄弱

**现状**：`versionStore.js` 快照为整页 `pageSnapshot` 全量 JSON；`diffVersions` 只返回 `titleChanged/bodyChanged` 布尔 + 全量 fromBody/toBody，无真实 diff 算法；无保留上限（主身份页已有 24 个版本快照）；回滚一次 +2 个版本（before + after）。

**影响**：版本膨胀；diff 无法支撑"这页改了什么"的阅读体验；存储随页面增长线性恶化。

#### D-05 治理状态机无校验

**现状**：`governanceStore.js` 状态 pending/approved/rejected/deferred；`updateStatus` 任意互转；deferred 无重新激活机制。

**影响**：状态语义不可信；误操作无法恢复（如 approved 误转 rejected 后无审计纠偏路径）。

#### D-06 巡检重复入队

**现状**：`enqueueInspectionGovernanceRequests` 批量入队**无去重**；inspector 的 `listPages` 先 `listSummaries`（已逐页读文件）再逐个 `get`，双重全量扫描。

**影响**：重复巡检产生重复治理请求；O(2N) 文件 IO。

#### D-07 压缩候选无消费端

**现状**：观察日志压缩候选可入队（治理队列），但无 apply 实现、无自动调度。

**影响**：治理动作悬空，观察日志无法按规则压缩，长期运行有流水账膨胀风险。

#### D-08 索引无锁重写

**现状**：page-index / keyword-index / version-index / review-queue 四个 JSON 均为 read-modify-write 整文件重写，无锁。

**影响**：并发写入丢更新（多窗口、工具+前端并发时）。

#### D-09 列表 N+1

**现状**：`listSummaries` 对每页调用 `this.get(pageId)` 单独读文件（N+1）。

**影响**：页面量增长后列表加载变慢；无分页上限。

#### D-10 追溯查询无缓存

**现状**：`getPageSourceTrace` / inspector 对每个 chatRef 各查一次 `getMessagesByDate`。

**影响**：多来源页面追溯时 DB 调用次数 = 来源条数，无复用。

#### D-11 删除/合并不回写索引

**现状**：`delete` / `mergePages` 不回写 topicIndex 的 `memoryPageIds`、对端页面的 `relatedPageIds`。

**影响**：孤儿引用累积，依赖巡检兜底修复。

#### D-12 每轮对话记忆开销

**现状**：orchestrator 每轮对话无条件调用 `recordConversationTurn` + `enqueueObservationWikiUpgradeCandidates` + 4 个 `upsertIdentity*FromConversation`（内部有判定，但每次都要读 wiki 页面）；contextBuilder 每轮全量构建 wiki 上下文。

**影响**：每轮对话多次文件 IO；对话频繁时性能与磁盘磨损。

#### D-13 死代码

**现状**：4 个 link 服务零引用（链路换道后未清理）；`createBetterSqlite3ChatlogRepositorySkeleton` 死骨架（repository.js:270 唯一 TODO 处）。

**影响**：维护成本、误导新读者、模块边界模糊。

#### D-14 测试覆盖薄弱

**现状**：service.js 1085 行仅 2 个顺序用例（`tests/services/memory-wiki-service.test.mjs`）；治理/版本/巡检边界无回归；工具接线无集成验证；M5/M6 验收只验定义。

**影响**：重构与收口无安全网；本次评估发现的"工具未接线"正是验收盲区。

#### D-15 双引擎

**现状**：聊天记录写走 sql.js、读走 better-sqlite3（server.js 显式启用）。

**影响**：一致性风险；两套代码路径维护成本。

#### D-16 slug 误提取残留

**现状**：主身份页 `page_id/slug = identity_profile_啥名字啊_1a442bb9`（首次"我叫啥名字啊"被正则误提取），title 已修正为"叶健钦"但 slug/pageId 未重建。

**影响**：URL/文件路径与内容不符；同类误提取问题在真实数据中已发生并靠人工治理拦截。

#### D-17 旧表退役缺失

**现状**：db.js 中 `memory_entries` 表与 CRUD 保留（仅数据兼容层），旧 `memory/` 模块运行时零引用。

**影响**：永久死重；无数据迁移/清理时间点。

---

## 4. 改进实现概述

### 4.0 主题零：记忆决策 LLM 化（对应 D-18，最高优先）

> 目标：把"是否计入记忆、记什么内容"的语义判定权从后端正则交还给 LLM，后端回归"执行与治理"职责，兑现设计哲学"LLM 决定、后端执行、人类把关"。

#### I-18 记忆提炼轮次（Memory Distillation Turn）

**核心机制**：对话结束后，在 orchestrator 中新增一个轻量的"记忆提炼"LLM 轮次（复用现有 `jsonProtocol` 的 JSON 协议与错误修复机制，低温度、输出受限），把以下输入交给 LLM：

1. 当日对话摘要（最近 N 条，非全量）。
2. 今日已有观察日志摘要（供 LLM 判定"新增 / 更新 / 不记"，替代后端正则去重前置）。
3. 相关记忆页摘要与今日是否已有关联。

LLM 输出结构化决策（示例）：

```json
{
  "observations": [
    { "action": "create", "type": "event", "title": "…", "content": "事实提炼，非原话" }
  ],
  "identity_updates": [
    { "entity": "profile", "field": "userName", "value": "叶健钦", "confidence": "high" }
  ],
  "memory_wiki_requests": [
    { "action": "update", "pageType": "identity_person", "title": "钟奕菲", "body": "…" }
  ],
  "reasoning": "不超过 1 句话"
}
```

**后端职责收窄为执行与治理**（语义判定全部移除）：

- 校验 LLM 输出的结构与字段白名单（防注入、防非法值）。
- 观察日志：按 LLM 提议执行 create / update / skip，仍做指纹去重与来源补链（保留现有 `addNoteSmart` 能力作为执行层）。
- 身份页面：按 LLM 提议的 `identity_updates` 走现有 upsert 落库路径，但**候选生成不再来自正则**，冲突检测与治理入队保留。
- 高风险动作（身份字段变更、页面合并/回滚/归档）仍走 policy + confirm 确认流。

**正则代码的去向**：

- 阶段一（过渡）：正则提取函数降级为"LLM 不可用/超时时的兜底候选"，并在日志与代码注释中明确标注 `FALLBACK`。
- 阶段二（收口）：LLM 通道稳定后删除正则提取（`extractUserName`、`buildTraitPatterns`、`shouldRecordObservation` 等），仅保留纯文本规范化工具（`stripTrailingParticles`、`normalizeString`）。

**关键设计点**：

1. **成本控制**：提炼轮次使用低温度 + 短输出限制（reasoning ≤ 1 句），避免每轮对话大幅增加延迟；可后续升级为"按日批量提炼"（每日结束时一次提炼当日全部对话）。
2. **与 D-01 的关系**：I-18 是"对话后模型自动提议"通道；D-01 工具接线是"对话中模型主动补查/提议"通道。两者共同实现"LLM 决定"，建议同 Phase 落地。
3. **人工把关保留**：LLM 提议 ≠ 直接写入。policy 风险分层 + confirm 流 + 治理队列（升级候选、冲突、review 态）继续作为人类最终裁决层，避免 LLM 过度写入。
4. **可观测性**：每次提炼轮次记录 `memory_distillation` 审计事件（提议数/采纳数/跳过数），用于评估 LLM 决策质量与正则对比。

**验收**：`verify-9.0-memory-distillation.mjs` 模拟一轮对话 → 断言观察日志内容为"提炼后的事实"而非"主人/铃湾原话拼接"；断言身份字段来自 LLM 提议而非正则命中；断言高风险提议仍进 confirm 流；断言 LLM 失败时走兜底且打 `FALLBACK` 标记。

**涉及文件**：`agent/orchestrator.js`（新增提炼轮次）、`agent/promptBuilder.js`（新增"记忆提炼"prompt 情景）、`agent/jsonProtocol.js`（扩展提炼输出 schema）、`observation/service.js`、`identity/*Upsert.js`（候选生成改由提炼轮次驱动）、`policy/rules.js`（提炼结果的策略映射）。

### 4.1 主题一：核心闭环修复（对应 D-01 / D-02 / D-03 / D-16）

#### I-01 记忆工具接线

- **实现**：在 `electron/server.js` 的 `createServer` 内增加：
  - `import { registerMemoryWikiTools } from './backend/memory-wiki/tools.js'`
  - `await registerMemoryWikiTools({ baseDir, store }, { registerTool })`
- **关键点**：确认 `baseDir` 传递方式——需与 orchestrator 中 identity upsert 使用的 `baseDir` 同源（当前为 `data/memory-wiki` 所在目录，需在 `main.js` 启动链中显式解析并传入 `createServer`，避免各模块各自 `process.cwd()`）。
- **配套**：新增 `verify-memory-tools-registered.mjs`：启动 server → `listTools()` 断言包含 `memory_wiki.*` 与 `memory_governance.*` 工具 → 断言 `buildConversationContext` 产出的 `toolSummary` 包含记忆工具 → 断言 policy 对 `memory_wiki.create_page` 返回 `confirm`。
- **验收**：模型对话中可调用记忆只读/写工具；policy 记忆规则可达；验收脚本全绿。

#### I-02 旧 person 页面迁移

- **实现**：新增迁移脚本 `scripts/migrate-legacy-person-pages.mjs`：
  - 扫描 `pages/people/*.md`（`page_type: person`）。
  - 若存在同名 `identity_person` 页面 → 合并（sourceRefs / relatedPageIds 合并去重）后删除旧页；否则改写 `page_type` 为 `identity_person` 并迁移到 `pages/identity/people/`。
  - 同步更新 `page-index.json`、`keyword-index.json`；对迁移页补拍版本快照。
- **验收**：`verify` 脚本断言 `pages/people/` 无残留、全仓库无 `page_type: person` 旧类型、无同名人物重复。

#### I-03 普通用户记忆前端收口

- **实现**（对齐 Cornie-017 第 8 节建议）：
  - `MemoryPageDetail.vue`：补全"新建"完整表单（页面类型选择 + 字段引导）、删除二次确认、ownerConfirmed 状态可见、来源摘要可读化（聊天/观察/相关页分组展示）。
  - `MemoryPageList.vue` / `ObserveMemoryHome.vue`：按 identity 类型（profile/person/preference/trait）分组与图标/标签表达；隐藏"pageId/status/importance"等高级术语，改平实文案。
  - 高级治理入口（MemoryWikiWorkspace）保持冻结，不作为普通用户目标。
- **验收**：前端 smoke 用例覆盖"新建→编辑→保存→删除"全流程；视觉回归用例覆盖四类页面展示。

#### I-04 slug 数据修复

- **实现**：新增修复脚本 `scripts/repair-slug-mismatch.mjs`：扫描 pageId/slug 与 title 不一致的页面，按 title 重建 slug，更新 frontmatter、page-index、版本关联；对"啥名字啊"等已知案例执行修复。
- **验收**：全仓库 pageId/slug 与 title 一致。

### 4.2 主题二：版本与治理加固（对应 D-04 / D-05 / D-06 / D-07）

#### I-05 版本层加固

- **实现**：
  - `versionStore.js` 增加**字段级 diff**：`diffVersions` 返回 `changedFields`（标题/摘要/状态/importance/正文/aliases/来源），正文差异用简单行级 LCS（或逐行比对标记 added/removed），避免整段全量输出。
  - **保留策略**：每页版本数上限（建议 50）+ 时间压缩（超过上限或超过 90 天的旧版本只保留 frontmatter 字段与 body 行数摘要，不保留全文）。
  - 回滚策略：保留 before 快照，after 快照改为可选（默认不拍，减少膨胀）。
- **验收**：verify 脚本断言版本上限生效、diff 输出字段级、回滚后版本数不再 +2。

#### I-06 治理状态机校验

- **实现**：`governanceStore.js` 定义显式转移图：
  - `pending → approved | rejected | deferred`
  - `deferred → pending | rejected`
  - 其余转移拒绝并报错；新增 `reactivateDeferred`（deferred→pending）。
- **验收**：状态机单测覆盖全部合法/非法转移；`updateStatus` 非法转移抛错。

#### I-07 巡检去重与扫描优化

- **实现**：
  - `enqueueInspectionGovernanceRequests` 按 `(requestType + pageId/topicKey + 问题指纹)` 去重（复用 identity 候选已有的去重模式）。
  - inspector 内部改为单次遍历：`listPages` 一次性返回已读内容，避免"先 listSummaries 再逐页 get"的双重扫描。
- **验收**：连续两次巡检不产生重复请求；verify 脚本断言去重生效。

#### I-08 压缩候选闭环

- **实现**：新增 `observation/compressionApply.js`：
  - `applyObservationCompressionRequest`：读取同日同主题观察日志 → 生成压缩摘要观察 → 归档原始条目 → 补 sourceRef 与治理审计事件。
  - 接入治理路由 `applyGovernanceUpgradeRequest` 同级入口；前端待审核区可选展示。
- **验收**：verify 脚本模拟"候选入队→批准→压缩执行→原始归档"闭环。

### 4.3 主题三：性能与一致性（对应 D-08 / D-09 / D-10 / D-11 / D-12）

#### I-09 索引写一致性

- **实现**：storage 层为四个 JSON 索引引入**单写者队列**（进程内 Promise 链串行化 read-modify-write），或写后合并（短窗口 debounce）；页面文件与索引更新纳入同一 try/catch 回滚流程。
- **验收**：并发写入压力用例（10 并发）无丢更新。

#### I-10 列表性能与分页

- **实现**：`listSummaries` 改为基于 `page-index.json` 轻索引直接产出摘要（不逐页读文件），正文类字段按需延迟读取；增加 `limit/offset` 分页参数并贯通 REST 与前端。
- **验收**：100 页规模下 listSummaries 响应时间下降（基准对比记录在 `doc/test/`）。

#### I-11 追溯查询缓存

- **实现**：`getPageSourceTrace` / inspector 按日期批量取消息（同一天多个 chatRef 只查一次 `getMessagesByDate`）；可选进程内短 TTL 缓存。
- **验收**：同一页面追溯的 DB 调用次数 = 涉及日期数而非来源条数。

#### I-12 删除/合并索引回写

- **实现**：`delete` / `mergePages` 时同步：清理 topicIndex `memoryPageIds`、对端页面 `relatedPageIds`、keyword-index 关联；删除页保留审计记录。
- **验收**：删除/合并后运行巡检零孤儿发现。

#### I-13 每轮记忆开销控制

- **实现**：orchestrator 记忆沉淀改为**由提炼轮次结果驱动**（Phase 0 落地后）：仅当 LLM 提炼结果含观察/身份提议时才执行对应写入，不再无条件跑 6 条链路；上下文构建中无 query 命中时跳过 chatRecall 层。
- **验收**：每轮对话记忆相关文件 IO 次数下降（日志埋点对比）。

### 4.4 主题四：清理与工程化（对应 D-13 / D-14 / D-15 / D-17）

#### I-14 死代码清理

- **实现**：
  - 删除零引用文件：`observation/wikiLink.js`、`observation/topicLink.js`、`chatlog/memoryLink.js`、`chatlog/topicLink.js`。
  - 删除 `createBetterSqlite3ChatlogRepositorySkeleton` 死骨架。
  - 清理前 grep 复核零引用；清理后跑 `test:full` 全绿。
- **验收**：grep 零引用 + 全量测试通过。

#### I-15 测试补强

- **实现**（建议与 Phase 1-2 并行推进）：
  - `service.js` 结构化回归：create/update/archive/restore/merge/rollback/compress 状态机与坏页容错。
  - 治理状态机单测、巡检去重单测、压缩闭环单测。
  - 工具接线集成测试（`verify-memory-tools-registered` 纳入 `test:full`）。
  - 前端 vitest 补记忆页面组件用例（新建/编辑/删除/来源展示）。
- **验收**：记忆层相关用例数 ≥ 30；`npm run test:full` 全绿。

#### I-16 双引擎统一决策

- **实现**：评估后二选一：
  - 方案 A（推荐）：聊天记录读写全部迁移 better-sqlite3（repository 已抽象，删 sql.js 写路径）。
  - 方案 B：明确 sql.js 保留范围并文档化边界。
- **验收**：读写一致性测试通过；决策记录写入本计划修订记录。

#### I-17 旧表退役

- **实现**：评估 `memory_entries` 历史数据价值：
  - 有保留价值 → 迁移脚本导数据到 Memory Wiki（映射为页面）后删表。
  - 无价值 → 直接删除表与 CRUD 函数。
- **验收**：db.js 无 `memory_entries` 残留或迁移后数据完整。

---

## 5. Phase 排期

### 5.1 排期总览

| Phase | 主题 | 包含改进 | 优先级 | 预计规模 | 目标 |
| --- | --- | --- | --- | --- | --- |
| Phase 0 | **记忆决策 LLM 化** | I-18、I-01 | **P0（最先）** | L | 兑现"是否计入记忆由 LLM 决定"设计原则；正则提取退场；模型工具接线 |
| Phase 1 | 核心闭环修复 | I-02、I-03、I-04 | P0 | 中 | 消除数据双轨；前端增删改查可用 |
| Phase 2 | 版本与治理加固 | I-05、I-06、I-07、I-08 | P1 | 中 | 版本/治理机制可信、可维护 |
| Phase 3 | 性能与一致性 | I-09、I-10、I-11、I-12、I-13 | P1/P2 | 中 | 并发安全、列表/追溯性能达标、每轮开销可控 |
| Phase 4 | 质量与工程化 | I-14、I-15、I-16 | P2 | 中 | 死代码清零、测试覆盖补强、引擎统一 |
| Phase 5 | 数据退役 | I-17（+ Phase 0-4 遗留） | P3 | 小 | 旧数据链路彻底收口 |

### 5.2 Phase 0：记忆决策 LLM 化（P0，最先完成）

> 目标：把"是否计入记忆、记什么"的语义判定权交还给 LLM，后端回归执行与治理；同时让模型获得记忆工具，打通"模型提议"通道。**本 Phase 是改进计划的核心，直接兑现设计哲学。**

| 改进 | 严重度 | 工作量 | 涉及文件 | 验收 |
| --- | --- | --- | --- | --- |
| I-18 记忆提炼轮次 | P0 | L | `orchestrator.js`、`promptBuilder.js`、`jsonProtocol.js`、`observation/service.js`、`identity/*Upsert.js`、`policy/rules.js` | `verify-9.0` 通过：观察日志为提炼事实非原话、身份字段来自 LLM 提议、高风险仍走 confirm、LLM 失败走 FALLBACK |
| I-01 记忆工具接线 | P0 | S（半天） | `server.js`、`main.js`、新增 `scripts/verify-memory-tools-registered.mjs` | 运行时注册表含记忆工具；policy confirm 可达 |

**依赖**：I-18 依赖 I-01 的 `baseDir` 传递确认（提炼轮次与工具共用记忆服务入口）；I-18 落地前需先建立"提炼轮次输出 schema"与 policy 映射，并保留正则兜底（两阶段过渡，见 I-18）。

### 5.3 Phase 1：核心闭环修复（P0，紧随 Phase 0）

> 目标：让记忆层"数据一致、前端可见"。

| 改进 | 严重度 | 工作量 | 涉及文件 | 验收 |
| --- | --- | --- | --- | --- |
| I-02 旧 person 迁移 | P0 | S-M | 新增 `scripts/migrate-legacy-person-pages.mjs`、`memory-wiki/service.js`（如复用 mergePages） | `pages/people/` 无残留、无重复人物 |
| I-03 前端增删改查收口 | P0 | L | `MemoryPageDetail.vue`、`MemoryPageList.vue`、`ObserveMemoryHome.vue`、`api.js` | 前端全流程 smoke 用例通过 |
| I-04 slug 修复 | P2 | S | 新增 `scripts/repair-slug-mismatch.mjs` | 全仓库 slug 与 title 一致 |

**依赖**：I-03 依赖 I-02 完成（避免前端展示重复人物页）；I-02/I-04 在 Phase 0 的正则退场前后均可执行（互不阻塞）。

### 5.4 Phase 2：版本与治理加固（P1）

> 目标：让"能改、能回、能审"可信。

| 改进 | 严重度 | 工作量 | 涉及文件 | 验收 |
| --- | --- | --- | --- | --- |
| I-05 版本层加固 | P1 | M | `versionStore.js`、`service.js` | 版本上限生效、diff 字段级、回滚不再 +2 |
| I-06 治理状态机 | P1 | S | `governanceStore.js` | 非法转移抛错、deferred 可复活 |
| I-07 巡检去重优化 | P1 | S | `inspector.js`、`service.js` | 重复巡检无重复入队、单次扫描 |
| I-08 压缩闭环 | P1 | M | 新增 `observation/compressionApply.js`、`routes.js` | 压缩候选可执行到归档 |

### 5.5 Phase 3：性能与一致性（P1/P2）

> 目标：并发安全 + 规模可用。

| 改进 | 严重度 | 工作量 | 涉及文件 | 验收 |
| --- | --- | --- | --- | --- |
| I-09 索引写一致性 | P1 | M | `storage.js` | 并发写入无丢更新 |
| I-12 删除/合并索引回写 | P1 | S | `service.js`、`topicIndex.js` | 巡检零孤儿 |
| I-10 列表性能与分页 | P2 | M | `service.js`、`routes.js`、前端列表 | 100 页规模延迟达标 |
| I-11 追溯查询缓存 | P2 | S | `service.js`、`inspector.js` | 追溯 DB 调用次数=日期数 |
| I-13 每轮开销控制 | P2 | M | `orchestrator.js`、`contextBuilder.js`、`identity/*` | 每轮 IO 次数下降 |

### 5.6 Phase 4：质量与工程化（P2）

> 目标：代码库干净、测试有网。

| 改进 | 严重度 | 工作量 | 涉及文件 | 验收 |
| --- | --- | --- | --- | --- |
| I-14 死代码清理 | P2 | S | 删除 4 个 link 服务 + 死骨架 | grep 零引用、test:full 全绿 |
| I-15 测试补强（可与 Phase 1-2 并行） | P1 | M-L | `tests/` 新增用例 | 记忆层用例 ≥ 30、覆盖率提升 |
| I-16 双引擎统一 | P2 | M | `chatlog/repository.js`、`server.js`、`db.js` | 读写一致、单一引擎路径 |

### 5.7 Phase 5：数据退役（P3）

| 改进 | 严重度 | 工作量 | 涉及文件 | 验收 |
| --- | --- | --- | --- | --- |
| I-17 旧表退役 | P3 | S | `db.js`、迁移脚本 | 无 `memory_entries` 残留或迁移完整 |

---

## 6. 验证与验收体系

1. **每项改进**：对应一个 `verify-*.mjs` 验收脚本（沿用现有 `verify-taskXXX` 模式），纳入 `package.json` scripts。
2. **大阶段收口**：Phase 0-4 各配一个汇总回归（参考 `verify-task407` 串行模式）：
   - `verify:9.0`（Phase 0 收口）：记忆提炼轮次 + 工具注册 + 正则退场（观察日志非原话、身份字段来自 LLM 提议）。
   - `verify:9.1`（Phase 1 收口）：person 迁移 + 前端 smoke。
   - `verify:9.2`（Phase 2 收口）：版本/状态机/巡检/压缩。
   - `verify:9.3`（Phase 3 收口）：并发/性能/索引一致性。
   - `verify:9.4`（Phase 4 收口）：死代码清零 + test:full 全绿。
3. **回归**：每个 Phase 完成时运行 `npm run test:full` + 对应 verify 脚本，结果记录到 `doc/test/`。

---

## 7. 风险与依赖

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| I-18 LLM 决策质量不稳定 | 提炼轮次偶发漏记/乱记，或输出结构不合法 | 沿用 jsonProtocol 修复重试机制；后端保留字段白名单校验与去重；记录 `memory_distillation` 审计事件用于持续评估；正则兜底作为两阶段过渡安全网 |
| I-18 每轮额外 LLM 调用成本 | 提炼轮次增加延迟与 token 消耗 | 低温度 + 短输出限制（reasoning≤1 句）；可升级为按日批量提炼；观察日志可降频（非每轮） |
| I-18 提炼与 D-01 工具并存的双写 | 对话中模型用工具写 + 对话后提炼写，可能重复 | 明确职责：工具=对话中主动补查/即时提议，提炼=对话后复盘沉淀；两者都走后端去重与治理去重 |
| I-01 接线后模型行为变化 | 模型获得记忆工具后可能过度使用（恐怖谷） | 先注册只读工具（get/list/search），写工具观察一轮后再开；policy 层保持 confirm 强制 |
| I-02 迁移数据丢失 | 人物页合并误删 sourceRef | 迁移前全量备份 `data/memory-wiki/`；迁移脚本幂等可重跑；迁移后跑巡检校验 |
| I-05 版本压缩误伤 | 压缩策略误删仍被引用的旧版本 | 压缩仅作用于超过上限的旧版本；回滚目标版本永不被压缩 |
| 前端收口范围蔓延 | I-03 可能演变成新 UI 大改 | 严格对齐 Cornie-017 边界：只做普通用户增删改查，高级治理冻结 |
| 死代码清理连带 | 删除 link 服务前需确认无动态引用 | 清理前 grep 全量复核 + 测试全绿后再删 |

**外部依赖**：无（全部为仓库内工作）。

---

## 8. 结论

Cornie 记忆层的**设计**是产品级的，**后端底座与消费闭环**已经成型。本次改进的核心不是重新设计，而是完成四件收口事：

1. **决策权归还**（Phase 0，最优先）：将"是否计入记忆、记什么内容"的语义判定权从后端正则交还给 LLM——新增记忆提炼轮次（LLM 提议、后端执行、人类把关），同时接线已写好的记忆工具，彻底兑现"由 LLM 决定"的设计哲学，消除观察日志流水账与正则误提取脏数据。
2. **接线**（Phase 0）：让 30+ 记忆工具与 policy 策略真正生效。
3. **加固**（Phase 2-3）：版本、治理、索引一致性达到"可长期维护"标准。
4. **对齐**（Phase 1 + 4-5）：普通用户前端看得懂、改得动，代码库与数据干净可退役。

按 Phase 0→5 推进，每阶段有独立验收，风险可控，不依赖外部资源。

---

**文档结束**
