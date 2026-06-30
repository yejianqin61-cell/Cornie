# 393-观察日志升级候选到Identity-Wiki正式应用链路补齐

## 1. 任务目标

根据以下设计稿：

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

当前系统已经具备：

- 观察日志按需记录
- 从观察日志中识别 Identity 升级候选
- 将候选写入 `wiki_upgrade_candidates` 治理池

但还缺最后一段正式闭环：

- 人类审核通过后
- 候选要能被正式应用到 Identity-Wiki
- 并将治理请求状态同步更新

本任务就是补齐这条“候选入池 -> 审核通过 -> 正式落页”的正式应用链路。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/observation/`
- `electron/backend/memory-wiki/`
- `scripts/`

## 4. 当前问题

现在的系统状态是：

- `observation/wikiUpgrade.js` 已经能生成 4 类升级候选：
  - `upgrade_identity_profile_from_observation`
  - `upgrade_identity_preference_from_observation`
  - `upgrade_identity_trait_from_observation`
  - `upgrade_identity_person_from_observation`
- 候选会进入 `wiki_upgrade_candidates`
- 但仓库里还没有正式的“apply”执行器
- 也没有 route/tool 能让人类或模型触发这个正式应用动作

结果就是：

- 系统“会提请”
- 但“不会正式落地”

## 5. 目标设计

补齐一个统一的正式应用执行链路：

1. 根据 `requestId` 读取治理请求
2. 校验它确实属于 `wiki_upgrade_candidates`
3. 根据 `payload.action` 分发到对应 Identity upsert 逻辑
4. 正式写入/更新 Identity 页面
5. 对已应用页面补 owner confirmed
6. 如为 trait 页面，补状态提升
7. 给页面补 observation 来源引用
8. 将治理请求状态改为 `approved`

## 6. 实现步骤

### Step 1

新增 observation 升级候选正式应用执行器：

- 建议文件：
  - `electron/backend/observation/wikiUpgradeApply.js`

职责：

- 读取治理请求
- 解析 evidence / payload
- 还原 observation 与 userMessage
- 调用对应 Identity upsert 入口
- 对落地页面补 owner confirmed 与来源引用

### Step 2

在 memory wiki service 中暴露统一入口：

- `applyGovernanceUpgradeRequest(requestId)`

让 service 层能统一承接“正式应用升级候选”动作。

### Step 3

补齐对外接口：

- route：
  - `POST /memory-wiki/governance/:requestId/apply`
- tool：
  - `memory_governance.apply_upgrade_request`

确保：

- 模型可以调用
- 人类接口后续也能直接接入

### Step 4

补专项验证脚本，至少覆盖：

- profile 候选正式应用
- preference 候选正式应用
- trait 候选正式应用
- person 候选正式应用
- 请求状态更新为 `approved`
- 目标页面实际创建或更新成功

## 7. 测试点

- 只能应用 `wiki_upgrade_candidates` 队列中的请求
- 未知 action 要报错
- 应用后治理请求状态变为 `approved`
- profile / preference / trait / person 四类候选都可落地
- 落地页面应标记 `ownerConfirmed = true`
- trait 页面正式应用后不应继续停留在 `review`
- 页面应带上对应 observation 来源
- `npm run build` 通过

## 8. 完成标准

- 观察日志升级候选不再只是“入池”
- 它们已经具备“审核通过 -> 正式写入 Identity-Wiki”的正式执行闭环
- 与 0630 两份设计稿要求对齐

## 9. 提交建议

`feat(memory-governance): apply observation wiki upgrades into identity pages`
