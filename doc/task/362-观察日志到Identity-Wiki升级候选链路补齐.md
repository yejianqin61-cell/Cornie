# 362-观察日志到Identity-Wiki升级候选链路补齐

## 1. 目标

根据三份 0630 设计稿，补齐“观察日志是事实层，长期记忆 Wiki 是稳定认知层”的升级候选链路，让高价值事实可以从观察层进入长期记忆治理视野，但不直接粗暴写入。

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 2. 涉及范围

- `electron/backend/observation/service.js`
- `electron/backend/memory-wiki/governanceStore.js`
- `electron/backend/agent/orchestrator.js`
- `scripts/`

## 3. 核心要求

- 对观察日志中的高价值 Identity 线索生成升级候选
- 低价值、一次性事实继续留在观察层
- 候选进入治理池，而不是直接写正式 Wiki
- 候选需要保留来源观察日志引用

## 4. 本任务聚焦

- 用户名字
- 用户与 Cornie 的关系
- 反复出现的重要人物
- 多次稳定偏好

## 5. 验收标准

- 观察日志可生成长期记忆升级候选
- 候选对人类可见、可追溯来源
- 不会对普通流水事实过度升级
- 补验证脚本并通过 `npm run build`

## 6. 建议提交信息

`feat(observation): add wiki upgrade candidate flow`
