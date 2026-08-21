# R-02 聊天去重-前端 upsert 与去重放宽（Frontend Dedup Hardening）

## 背景

Cornie-023 §3.1 问题一主因的前端半：`hasEquivalentMessage`（`useChat.js:39-49`）去重失败——流式占位 id 是 `live-cornie-*`（≠ DB UUID），内容分支要求 `item.pendingSync === true`（仅 user 临时消息成立），cornie 占位永远不满足 → 轮询拉到 DB 消息时直接 `pushChatItem` 重复上屏；随后 `appendResponse` 的 replaceId 分支（`useChat.js:79-89`）把占位替换成同 UUID 同内容 → **两条同 id 消息**并存（ChatHome `:key="m.id"` 两条都渲染）。

## 目标

1. `hasEquivalentMessage` 对 cornie 消息放宽为 **role + content 相同即视为重复**（user 消息保持原语义：id 或 role+content+pendingSync）。
2. `replaceMessageById` 升级为 **upsert 语义**：先按 id 删除已存在的同 id 项，再替换/插入，杜绝同 id 并存。
3. 流式与非流式两条路径都覆盖。

## 范围

- `src/renderer/composables/useChat.js`（`hasEquivalentMessage`、`replaceMessageById`）
- `tests/frontend/` 新增去重测试（如 `chat-dedup.test.mjs`）

## 设计要求

### 1. hasEquivalentMessage 放宽

- 对 cornie 消息（`role === 'cornie'`）：`item.role === 'cornie' && item.content === msg.content` 即重复（不计 pendingSync）。注意避免误杀：同一句话用户让 Cornie 复述时（content 相同但轮次不同）——用 `item.id === msg.id` 优先精确匹配；content 匹配仅用于"轮询拉取 vs 本地已有"去重，且只对**非 interim、非 streaming** 的正式消息生效（interim 层间话语内容短且可能重复，不参与 content 去重；streaming 占位 content 为增量态不参与）。
- user 消息保持原逻辑（id 或 role+content+pendingSync）。

### 2. replaceMessageById upsert 语义

- 现状：找到同 id 项则整体替换（`messages.value[index] = {...}`）。
- 目标：先 `filter` 掉同 id 旧项，再 `push`（或 index 定位后替换）——保证任何时刻同 id 只有一条。
- 调用方不变（`appendResponse` replaceId 分支、`sendCore` 回填等照常工作）。

### 3. 防御：流式完成前轮询拉到同内容

- 场景：R-01 未合入前轮询窗口仍存在——`loadConversation` 拉到 DB 消息（正式 UUID + 内容 X），此时占位（liveId + streaming + content 已累积 X）→ hasEquivalentMessage：cornie 且 content 相同 → 跳过 push ✓（这是本任务的核心防御）。
- 若轮询拉到的消息 content 与占位累积不同（增量未完成）→ 不跳过 → 可能仍出现短暂重复——由 R-01（后端时序）根治；本任务保证"同 id/同 content"不再并存。

## 验收标准

1. 新增 `chat-dedup.test.mjs` 通过（受控时序 mock）：
   - 轮询先于流式 done 到达（同 content）→ 列表只有一条 cornie 消息。
   - 同 id 两条输入 → upsert 后只剩一条。
   - user 消息去重语义不变（pendingSync 判定仍生效）。
   - interim 消息不参与 content 去重（两条相同 interim 正常显示）。
2. 现有 stream-send / polling-timers / chat 相关测试不回归；`npx vitest run tests/frontend` 全绿。
3. 提交为 `fix(frontend): ...` 单提交，符合 commit 规范。

## 依赖

- 无（P0 优先；与 R-01 配套，可并行，一起验收）。
