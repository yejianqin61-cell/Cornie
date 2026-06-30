# 402-Identity Preference偏好页建模与条件注入收口

## 1. 任务目标

把用户偏好从“可记录”推进到“可稳定累积证据、可按话题命中召回、不会默认污染主链”的正式状态。

---

## 2. 任务来源

- `Cornie-0630-Identity记忆实体模型与页面结构设计.md` 第 5、8、9、10、11、13 节
- `Cornie-0630-记忆层改进治理总纲-第一版.md` 第 5、8、9、10 节

---

## 3. 目标设计

### 3.1 字段完整

确保 `identity_preference` 支持：

- `preferenceType`
- `stance`
- `summary / preferenceSummary`
- `stabilityLevel`
- `evidenceCount`
- `lastConfirmedAt`
- `triggerKeywords`

### 3.2 证据累积

同一偏好重复表达时：

- 递增 `evidenceCount`
- 更新 `stabilityLevel`
- 累积关键词与来源

### 3.3 主链边界

无 query 时：

- 偏好页不应默认进入主链

相关 query 时：

- 偏好页可进入条件召回
- 优先命中和当前话题最相关的偏好页

### 3.4 Topic 联动

偏好页应自动补齐 Topic Index 关联，便于后续从关键词反查日期与来源。

---

## 4. 实施点

- `electron/backend/identity/preferenceUpsert.js`
- `electron/backend/agent/wikiContext.js`
- `electron/backend/memory-wiki/service.js`

---

## 5. 完成标准

- 偏好页可累积证据并升级稳定性
- 偏好页仅在相关 query 时注入
- 偏好页具备 topic 侧联动
- 有专项脚本覆盖创建、重复提及、条件注入

---

## 6. 提交建议

`feat(identity-preference): finalize evidence buildup and conditional injection`
