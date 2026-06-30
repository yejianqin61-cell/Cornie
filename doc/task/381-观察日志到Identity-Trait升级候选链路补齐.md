# 381-观察日志到Identity-Trait升级候选链路补齐

## 1. 任务目标

根据 `Cornie-0630-Identity记忆实体模型与页面结构设计.md` 与 `Cornie-0630-记忆层改进治理总纲-第一版.md` 中对 `identity_trait` 的实体定义，补齐观察日志到 `identity_trait` 的升级候选链路，让高价值、可疑似长期成立的性格/侧写线索也能从事实层进入长期记忆升级审核运行面，而不是只覆盖 `profile / preference / person` 三类。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`
- `doc/task/362-观察日志到Identity-Wiki升级候选链路补齐.md`
- `doc/task/354-Identity性格侧写谨慎写入与确认边界补齐.md`

## 3. 涉及范围

- `electron/backend/observation/wikiUpgrade.js`
- `scripts/`

## 4. 当前问题

当前观察日志升级候选链路已经支持：

- `identity_profile_upgrade_candidate`
- `identity_preference_upgrade_candidate`
- `identity_person_upgrade_candidate`

但还缺少：

- `identity_trait_upgrade_candidate`

这会导致一些明明适合进入“长期侧写审查”的观察事实，只能停留在观察日志层，无法进入统一的升级候选池。

## 5. 目标设计

- 当观察日志中的用户原话可提取出 `identity_trait` candidate 时，自动创建 trait 升级候选
- 候选进入 `wiki_upgrade_candidates`
- 保留观察日志证据、messageId、原始 sourceText
- 与已有升级候选保持相同的去重策略

## 6. 实现步骤

### Step 1

在观察日志升级链路中接入 `extractIdentityTraitCandidate`

### Step 2

定义 `identity_trait_upgrade_candidate` 的 request payload

### Step 3

补齐去重逻辑与验证脚本

## 7. 测试点

- 高价值 trait 线索会生成 trait 升级候选
- 候选会保留 observation source evidence
- 同一 observation 不会重复生成同类 trait 候选
- 普通低价值流水事实不会误生成 trait 候选
- `npm run build` 通过

## 8. 完成标准

- 观察日志升级候选链完整覆盖 `profile / preference / trait / person`
- `identity_trait` 不再缺席观察日志升级主链

## 9. 提交建议

`feat(observation): add trait wiki upgrade candidates`
