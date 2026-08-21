# 445 Identity Upsert 改造为 LLM Candidate 驱动

## 背景

4 个身份 upsert（`profileUpsert.js` / `personUpsert.js` / `preferenceUpsert.js` / `traitUpsert.js`）目前内部用正则 `buildCandidate(userMessage)` 生成候选再落库（Cornie-019 §4.4-4.7）。Cornie-019 V1.1 决策：候选生成不再来自正则，改由提炼轮次（443）的 LLM 提议驱动；正则 `buildCandidate` 删除。

## 目标

1. 4 个 upsert 函数仅接受 LLM 提议的 candidate 入参（移除内部正则候选生成）。
2. 保留现有冲突检测、治理入队、topic 补链、sourceRef 等落库机制不动。
3. 无 LLM 候选时返回 `skipped`，不落库。

## 范围

- `electron/backend/identity/profileUpsert.js`（`upsertIdentityProfileFromConversation`）
- `electron/backend/identity/personUpsert.js`（`upsertIdentityPersonFromConversation`）
- `electron/backend/identity/preferenceUpsert.js`（`upsertIdentityPreferenceFromConversation`）
- `electron/backend/identity/traitUpsert.js`（`upsertIdentityTraitFromConversation`）
- 调用方：`electron/backend/agent/memoryDistillation.js`（443）、`observation/wikiUpgradeApply.js`（随 446 调整）

## 设计要求

### 1. 函数签名改造

- `upsertX(store, { baseDir, date, messageId, userMessage, candidate })`：`candidate` 必填（LLM 提议字段对象）；缺失或全部字段为空 → 返回 `{ action: 'skipped', reason: 'no_candidate' }`。
- 删除模块内正则提取函数（随 444 清单）；保留字段归一化（如 `stripTrailingParticles`，移公共处）。

### 2. 实体字段白名单（与提炼轮次 schema 对齐）

| entity | 必填字段 | 可选字段 |
| --- | --- | --- |
| profile | 至少一个字段 | userName / preferredName / cornieRelationship / identitySummary / lifeStageSummary / currentFocus / stressors / communicationPreference |
| person | personName（+建议 relationshipToUser） | roleSummary / personalitySummary / meaningToUser / sharedExperienceSummary / timelineSummary / firstKnownPeriod / emotionalWeight |
| preference | title | stance / preferenceType / triggerKeywords |
| trait | title | traitType / traitSummary / triggerKeywords |

- 必填缺失 → `skipped`（reason 注明缺哪个字段），不创建空标题页面。

### 3. 落库机制保留

- 冲突检测与治理入队、ownerConfirmed 默认 false、topic 补链、sourceRef 去重等现有逻辑**原样保留**。
- person 的 `roleSummary` 等派生字段：LLM 未提供时不自动推导（避免回到规则化），允许为空。

### 4. 反例回归（写入验收用例）

- "我不累""没有压力"（否定句）：LLM 决策下不产生 stressors 写入。
- "我叫啥名字啊"（疑问句）：不产生 userName 提取。
- "我朋友喜欢猫"：不产生用户偏好。
- 以上依赖 LLM 正确决策；后端只需验证"candidate 缺失/空 → skipped"。

## 验收标准

1. 4 个 upsert 无正则候选生成代码残留（配合 444 grep）。
2. 传入 LLM candidate → 按现有路径落库/冲突入队，行为与改造前一致（回归）。
3. 空 candidate → `skipped`，无任何页面/观察创建。
4. "我不累"类反例在 verify-9.0（448）中通过。

## 依赖与衔接

- 依赖：443（提炼轮次先产出 candidate）。
- 衔接：444（正则删除）、446（wikiUpgradeApply 调用方调整）、448（verify-9.0 反例）。
- 上游设计：Cornie-019 §6.2、§8 T-3；Cornie-018 I-18（候选生成移除正则）。
