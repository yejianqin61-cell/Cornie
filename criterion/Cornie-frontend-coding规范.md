# Cornie 前端编码规范

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 前端编码规范 |
| 文件名称 | Cornie-frontend-coding规范.md |
| 产品名称 | Cornie（铃湾 / 小铃湾） |
| 文档编号 | criterion 系列 |
| 文档类型 | 编码规范（Criterion） |
| 文档版本 | V1.0 |
| 文档状态 | 生效中 |
| 编写日期 | 2026-08-25 |
| 适用对象 | 研发 |
| 关联文档 | `doc/Cornie-025`（审计）、`doc/Cornie-026`（选型）、`doc/task-025/T-01~T-03`（基建） |
| 存放目录 | `criterion/` |

---

## 2. 目标

本文档是前端代码的**唯一规范来源**（F-04）。任何新代码与重构必须满足本文档；不满足即视为缺陷。静态检查（ESLint/Prettier/Stylelint）是本规范的机器化子集，`npm run lint` 是准入门槛。

---

## 3. 目录结构

```
src/renderer/
├── main.js                  # 应用入口（仅装配：createApp + router + style）
├── App.vue                  # 壳层：左侧导航 + 顶部栏 + RouterView + 配网引导
├── router.js                # 路由表（唯一导航事实源）
├── style.css                # 全局元素样式（@layer base，不写组件样式）
├── styles/tokens.css        # 设计 Token（@theme static，唯一 token 来源）
├── lib/utils.js             # 通用纯函数（如 cn()）
├── composables/             # 跨组件共享逻辑（useXxx.js）
├── api/                     # API 客户端（按域分文件，index 桶导出）
└── components/
    ├── ui/                  # 基座组件（UiXxx：Button/Card/Dialog/...）——只做通用件
    └── *.vue                # 业务组件/页面（按域组织，可建子目录）
```

## 4. 设计 Token 与样式

1. **颜色、字号、间距、圆角、阴影、动效一律来自 `styles/tokens.css`**（`@theme static`）。
2. 规范名 `--color-*`/`--text-*`/`--spacing-*`/`--radius-*`/`--shadow-*`/`--duration-*` 供新代码使用；旧名 `--bg/--surface/--accent/--pet-*` 为兼容层，**新代码禁止使用旧名**。
3. 禁止新增裸 hex/rgba 字面色（Stylelint `color-no-hex` 告警即红线）。需要颜色透明度变体用 `color-mix(in srgb, var(--color-x) N%, transparent)`。
4. 字号只能取 10 档刻度：11/12/13/14/16/18/20/24/28/32px（`--text-xs`~`--text-5xl`）。
5. 组件内样式优先 `scoped`；确需穿透时用 `:deep()` 并注释理由。禁止在组件里写全局选择器。

## 5. 组件规范

1. **基座组件**（`components/ui/`）：命名 `UiXxx`，只做通用件（按钮/卡片/弹窗/空态等），不掺业务文案；视觉完全走 token。
2. **业务组件**：优先组合基座组件（`UiCard`/`UiEmpty` 等），禁止复制粘贴基座样式。
3. SFC 块顺序固定：`<script setup>` → `<template>` → `<style scoped>`。
4. props 全部声明 `type` 与 `default`（或 `required`）；emits 全部显式声明。
5. **禁止直接改 props**：对象型双向编辑用 `defineModel`（v-model），其余用 emits 上抛。
6. 组件尺寸红线：单文件 **≤500 行**；超限必须拆分子组件（参考 F-07）。
7. 命名法：组件文件名 `PascalCase.vue`；类名 `camelCase`（与现有代码库一致，不引 BEM）；composable `useXxx.js`；常量 UPPER_SNAKE。

## 6. 导航与状态

1. **路由是唯一导航事实源**：所有视图切换走 `router.js` 定义的路由（hash 模式），禁止在 App.vue 手写 v-if 视图链。
2. 跨模块跳转（记忆→聊天等）用 `router.push` + 路由参数/query，禁止多层事件手工接线。
3. 视图内局部状态（选中项、展开键）用组件内 ref；跨组件共享用 composable；不引入全局 store，除非确有跨域共享。

## 7. API 层

1. `src/renderer/api/` 按域拆分（chat/diary/ledger/todo/schedule/memory-wiki/observe/settings/...），每个文件一组领域函数；`index.js` 桶导出。
2. 请求统一走 `lib/request.js` 的结构化封装（超时/Abort/错误分类），禁止裸 fetch。
3. 业务组件不直接 import api 内部文件，只从桶入口取。

## 8. 质量门禁

1. `npm run lint`（ESLint + Prettier + Stylelint）必须零错误；提交前必跑。
2. `npm run test:frontend` 必须全绿；新组件/新交互必须补 `tests/frontend/*.test.mjs`。
3. `test:fast` 已含 lint 门禁；`check:cleanliness` 保持通过。
4. 提交信息遵循 `criterion/Cornie-commit-message规范.md`；每个 task 单提交。

## 9. 评审清单（自检）

- [ ] 新颜色/字号是否来自 token？（旧名是否误用？）
- [ ] 是否复制了基座组件样式？（应改为引用 `ui/*`）
- [ ] 是否改 props？（应 defineModel / emits）
- [ ] 是否新增视图切换但没走路由？
- [ ] 组件是否超过 500 行？
- [ ] `npm run lint` 零错误？测试全绿？
