# 403-Identity Trait侧写页谨慎写入与审核边界收口

## 1. 任务目标

把用户 trait 侧写页收口成“高门槛、弱默认、强治理”的正式能力，避免一次聊天就形成武断长期标签。

---

## 2. 任务来源

- `Cornie-0630-Identity记忆实体模型与页面结构设计.md` 第 6、8、9、10、11、13 节
- `Cornie-0630-记忆层改进治理总纲-第一版.md` 第 5、8、9、10、12 节

---

## 3. 目标设计

### 3.1 字段完整

确保 `identity_trait` 支持：

- `traitType`
- `traitSummary`
- `confidenceLevel`
- `stabilityLevel`
- `evidenceCount`
- `ownerConfirmed`
- `triggerKeywords`

### 3.2 谨慎写入

trait 页创建和更新应遵循：

- 需要明显证据
- 重复表达时提升稳定性
- 默认先进入 `review`
- 未确认前不应高频默认注入

### 3.3 条件召回

仅在以下场景命中：

- 情绪
- 压力
- 关系
- 沟通风格

且应避免大段、武断表达。

### 3.4 治理要求

高风险 trait 必须可治理：

- 可确认
- 可撤回
- 可追来源

---

## 4. 实施点

- `electron/backend/identity/traitUpsert.js`
- `electron/backend/agent/wikiContext.js`
- `electron/backend/memory-wiki/service.js`

---

## 5. 完成标准

- trait 页默认 review 化
- trait 页不再无关场景默认注入
- 情绪 / 压力类 query 下可按需命中
- 有专项脚本覆盖创建、升级、条件召回、治理边界

---

## 6. 提交建议

`feat(identity-trait): tighten cautious writes and review gating`
