# 374-Identity偏好与侧写页到主身份页的自动补链

## 1. 任务目标

根据 `Cornie-0630-Identity记忆实体模型与页面结构设计.md` 中“Identity 页面之间的关系结构”要求，补齐 `identity_preference`、`identity_trait` 与 `identity_profile` 的自动双向补链，让 Identity 关系图谱不只覆盖人物页。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/identity/preferenceUpsert.js`
- `electron/backend/identity/traitUpsert.js`
- `scripts/`

## 4. 当前问题

当前自动关系补链只明确覆盖了：

- `identity_profile <-> identity_person`

但设计稿推荐的关系结构还包括：

- `identity_profile -> identity_preference`
- `identity_profile -> identity_trait`

这会导致：

- 偏好页和侧写页虽然被创建了，但仍容易成为“孤立页”
- 主身份页无法自然聚合这些 Identity 子页
- 关系图谱和来源治理能力在 preference / trait 上不完整

## 5. 目标设计

- 当自动沉淀出 `identity_preference` 时，若存在主身份页，则自动建立双向 related pages
- 当自动沉淀出 `identity_trait` 时，若存在主身份页，则自动建立双向 related pages
- 不破坏现有 evidence / status / sourceRefs 行为
- 新增验证脚本覆盖 preference 和 trait 两条链路

## 6. 实现步骤

### Step 1

在 preference upsert 中补 `ensureProfileLink()`。

### Step 2

在 trait upsert 中补 `ensureProfileLink()`。

### Step 3

新增验证脚本，确认主身份页与 preference / trait 页双向补链成功。

## 7. 测试点

- 主身份页存在时，preference 页创建后会自动补链
- 主身份页存在时，trait 页创建后会自动补链
- 关系为双向，不只是 profile 单向指向子页
- `npm run build` 通过

## 8. 完成标准

- `identity_profile` 与 `identity_preference` 的推荐关系真正落地
- `identity_profile` 与 `identity_trait` 的推荐关系真正落地
- Identity 关系图谱与 0630 设计稿更一致

## 9. 提交建议

`feat(identity): auto-link profile with preference and trait pages`
