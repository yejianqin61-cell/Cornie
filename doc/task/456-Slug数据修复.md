# 456 Slug 数据修复

## 背景

主身份页 `data/memory-wiki/pages/identity/profiles/啥名字啊.md` 的 `page_id/slug = identity_profile_啥名字啊_1a442bb9`（首次"我叫啥名字啊"被正则误提取，Cornie-018 D-16），title 已人工修正为"叶健钦"但 slug/pageId 未重建，URL/文件路径与内容不符。

## 目标

1. 扫描 pageId/slug 与 title 不一致的页面。
2. 按 title 重建 slug，同步 frontmatter、page-index、版本关联。
3. 修复"啥名字啊"等已知案例。

## 范围

- 新增 `scripts/repair-slug-mismatch.mjs`
- `data/memory-wiki/pages/**`（frontmatter）、`data/memory-wiki/index/page-index.json`、`data/memory-wiki/versions/version-index.json`

## 设计要求

1. 扫描全仓库页面，检测 `page_id`/`slug` 与 `title` 的语义不一致（含历史误提取特征）。
2. 重建 slug：按 title 规范化；同步更新 frontmatter、page-index、版本索引中所有引用。
3. 对已知案例（"啥名字啊" → 叶健钦）执行修复。
4. 脚本幂等；修复前后可 diff 审计。

## 验收标准

1. 全仓库 pageId/slug 与 title 一致（扫描脚本输出为空）。
2. 主身份页路径/引用全部指向新 slug，旧引用无残留。
3. 修复后记忆页可正常打开与编辑（配合 442 已修的坏页）。

## 依赖与衔接

- 上游设计：Cornie-018 I-04（Phase 1）；Cornie-019 §5.1（"啥名字啊"脏数据实证）。
