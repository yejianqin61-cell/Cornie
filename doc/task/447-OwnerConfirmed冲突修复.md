# 447 OwnerConfirmed 冲突修复

## 背景

`observation/wikiUpgradeApply.js` 的 `applyOwnerConfirmed`（L72-92）只检查 `applyResult.pageId` 是否存在即置 `ownerConfirmed: true`；当 upsert 返回 `action: 'conflict'`（数据冲突未合并，如 profileUpsert 冲突分支）时仍标记可信（Cornie-019 N-05 / Cornie-018 后端审查 P2-2）。而 `wikiContext.scorePage` / `personNeedsRiskyDetails` 会把 `ownerConfirmed` 视为可信信号，解锁性格/意义等敏感字段注入，威胁长期记忆可信度。

## 目标

1. 仅当 upsert 结果为 `created` / `updated`（真实写入且无冲突）时才置 `ownerConfirmed: true`。
2. `conflict` 场景不置已确认，并生成/保留待决治理项供人类处理。
3. 冲突解决后由人类确认流程（治理审批）再置已确认。

## 范围

- `electron/backend/observation/wikiUpgradeApply.js`（`applyOwnerConfirmed` 及调用处）

## 设计要求

### 1. 判定条件收紧

- `applyOwnerConfirmed` 增加 `applyResult.action` 判断：
  - `created` / `updated` → 允许置 `ownerConfirmed: true`；
  - `conflict` → 不置 true，保留原状态；确保对应冲突治理请求已入队（upsert 内部已处理，确认无遗漏即可）；
  - `skipped` / `noop` / 无 pageId → 直接返回，不做任何标记。

### 2. 冲突治理闭环

- conflict 场景确保 `identity_profile_conflict` / `identity_person_relationship_conflict` 等治理项处于 pending，人类在治理队列处理后（approved）再由现有流程固化。

### 3. 回归保障

- 新增/更新用例：模拟 conflict 场景，断言页面 `ownerConfirmed` 保持 false，且治理队列存在 pending 冲突项。

## 验收标准

1. conflict 场景：页面 `owner_confirmed` 保持 false；治理队列含对应 pending 冲突项。
2. created/updated 场景：行为与现状一致（置 true）。
3. `npm run test:fast` 通过（含新增 conflict 用例）。

## 依赖与衔接

- 依赖：无（独立小修复，可与 443-446 并行）。
- 衔接：446（审批执行链路调整）、468（测试补强）。
- 上游设计：Cornie-019 §5.2 N-05、§8 T-5；Cornie-018 审查二 P2-2。
