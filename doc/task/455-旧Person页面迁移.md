# 455 旧 Person 页面迁移

## 背景

`data/memory-wiki/pages/people/钟奕菲.md`（`page_type: person`，旧模型）与 `data/memory-wiki/pages/identity/people/钟奕菲.md`（`page_type: identity_person`，新模型）并存，页面级重复（Cornie-018 D-02）；前端可能展示两条"钟奕菲"。

## 目标

1. 扫描并迁移旧 `person` 页面到 `identity_person` 模型。
2. 同名页面合并去重，消除双轨。
3. 迁移后全仓库无 `page_type: person` 旧类型残留。

## 范围

- 新增 `scripts/migrate-legacy-person-pages.mjs`
- `data/memory-wiki/pages/people/**`、`data/memory-wiki/pages/identity/people/**`
- `data/memory-wiki/index/page-index.json`、`keyword-index.json`

## 设计要求

1. 扫描 `pages/people/*.md`（`page_type: person`）。
2. 若存在同名 `identity_person` 页面 → 合并（sourceRefs / relatedPageIds 合并去重）后删除旧页；否则改写 `page_type` 为 `identity_person` 并迁移到 `pages/identity/people/`。
3. 同步更新 page-index / keyword-index；迁移页补拍版本快照。
4. 脚本幂等可重跑；迁移前建议备份 `data/memory-wiki/`。

## 验收标准

1. `pages/people/` 无残留；全仓库无 `page_type: person` 旧类型。
2. 无同名人物重复页面。
3. 迁移后运行巡检（memory-wiki inspector）零新孤儿/断链。
4. 验收脚本（可并入本任务 verify）全绿。

## 依赖与衔接

- 上游设计：Cornie-018 I-02（Phase 1）；Cornie-019 §5.1（脏数据背景）。
