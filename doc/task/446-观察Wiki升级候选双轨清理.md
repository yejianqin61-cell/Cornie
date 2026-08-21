# 446 观察→Wiki 升级候选双轨清理

## 背景

当前同一正则候选存在双轨重复触发（Cornie-019 N-04）：orchestrator 尾部直接调用 4 个身份 upsert 落库（③④⑤⑥），同时 `enqueueObservationWikiUpgradeCandidates`（`observation/wikiUpgrade.js` L107-169）对同一 userMessage 再跑一遍 4 个正则 extract 生成治理候选（②），治理队列已出现被人工 rejected 的"啥名字啊"等错误候选（`data/memory-wiki/governance/review-queue.json` 实证）。

Cornie-019 V1.1/V1.2 决策：正则 extract 全面删除；观察→Wiki 升级候选改由提炼轮次（443）的 LLM 决策驱动。

## 目标

1. 移除 `enqueueObservationWikiUpgradeCandidates` 及其对 4 个正则 extract 的复用。
2. 观察→Wiki 升级链路改为：提炼轮次输出的 `memory_wiki_requests` / `identity_updates` 直接驱动治理入队。
3. 治理队列不再出现正则误提取候选。

## 范围

- `electron/backend/observation/wikiUpgrade.js`（删除或重构为提炼驱动）
- `electron/backend/observation/wikiUpgradeApply.js`（审批执行链路调整，配合 447）
- `electron/backend/agent/orchestrator.js`（移除 ② 调用）
- `electron/backend/agent/memoryDistillation.js`（443，治理入队入口）

## 设计要求

### 1. 移除正则候选入队

- 删除 `enqueueObservationWikiUpgradeCandidates` 中对 `extractIdentityProfileCandidate` / `extractIdentityPreferenceCandidate` / `extractIdentityTraitCandidate` / `extractIdentityPersonCandidate` 的调用（这些 extract 函数随 444 删除）。
- orchestrator 移除 ② 链。

### 2. 提炼驱动的治理入队

- 提炼轮次输出中：
  - `identity_updates` 含冲突/低置信提议 → 由现有 upsert 内部治理入队（445 保留的机制）；
  - `memory_wiki_requests` 破坏性动作（merge/rollback/archive/delete）→ 提炼轮次直接入治理队列（443 已定义）；
  - 观察日志升级候选不再自动产生（观察内容由 LLM 提炼，直接落 observation 层）。

### 3. 旧治理数据清理

- 评估 `review-queue.json` 中 `wiki_upgrade_candidates` 分区存量：被 rejected 的直接归档；pending 中依赖正则 extract 的旧候选标注失效或清理（决策记录写入本任务文档修订）。

## 验收标准

1. `grep -r "wiki_upgrade_candidates" electron/` 仅剩提炼驱动的入队路径（如 memory_wiki_requests 治理入队），无正则 extract 入队。
2. 治理队列不再新增"啥名字啊"类正则误提取候选。
3. 一轮对话后治理队列新增项可溯源到提炼轮次决策（审计事件）。

## 依赖与衔接

- 依赖：443、444、445。
- 衔接：447（ownerConfirmed 修复同属审批执行链路）。
- 上游设计：Cornie-019 §5.2 N-04、§8 T-4；Cornie-018 D-13（wikiUpgrade 相关死链清理）。
