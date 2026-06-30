# 400-Identity Profile结构化字段写入闭环与冲突治理收口

## 1. 任务目标

根据：

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

把 `identity_profile` 从“已有基础写入能力”收口到“结构化字段完整、冲突处理清晰、可稳定跨天复用”的状态。

---

## 2. 任务来源

- `Cornie-0630-Identity记忆实体模型与页面结构设计.md` 第 4、10、11、12、13 节
- `Cornie-0630-记忆层改进治理总纲-第一版.md` 第 4、5、8、9、10 节

---

## 3. 设计范围

本任务只处理主身份页：

- `identity_profile`

不在本任务内处理：

- 重要人物页细化
- 偏好页细化
- trait 页细化
- 聊天历史分页与检索

---

## 4. 目标设计

### 4.1 字段完整性

确保主身份页至少稳定支持以下字段：

- `userName`
- `preferredName`
- `cornieRelationship`
- `identitySummary`
- `lifeStageSummary`
- `currentFocus`
- `stressors`
- `communicationPreference`

并确保这些字段：

- 可以被 `upsertIdentityProfileFromConversation()` 保守写入
- 可以落到 Markdown 页面正文
- 可以在 summary 层稳定读回

### 4.2 冲突治理

以下字段出现新旧不一致时，不允许静默覆盖：

- `userName`
- `preferredName`
- `cornieRelationship`

要求：

- 保留旧值
- 记录新候选
- 进入治理请求
- 补来源引用

### 4.3 弱冲突字段处理

以下字段若为空可补写，若已有值且新值不同，应尽量遵循“保守更新”：

- `identitySummary`
- `lifeStageSummary`
- `currentFocus`
- `stressors`
- `communicationPreference`

要求：

- 不因一次偶发表达粗暴覆写长期稳定字段
- 对阶段画像类信息尽量补充，不轻易推翻

### 4.4 跨天稳定注入证明

要求通过脚本证明：

- 第二天 query 为空时，主身份摘要仍稳定进入主链
- 相关 query 下可按需展开压力与沟通偏好细节

---

## 5. 实施点

### 5.1 后端模块

重点检查并补强：

- `electron/backend/identity/profileUpsert.js`
- `electron/backend/memory-wiki/service.js`
- `electron/backend/agent/wikiContext.js`

### 5.2 验证脚本

至少补或更新：

- 主身份字段补写脚本
- 主身份冲突治理脚本
- 主身份跨天注入脚本

---

## 6. 完成标准

- 主身份页 8 个核心字段具备完整写入与读回闭环
- 高风险字段冲突不再静默覆盖
- 主身份页成为唯一默认稳定注入的 Identity 页面
- 有专项脚本证明该闭环成立

---

## 7. 提交建议

`feat(identity-profile): complete structured fields and conflict governance`
