# Cornie Phase 5 安装包分发收口简报

日期：2026-10-23  
版本：0.1.0  
基线：Phase 4 工程规则收口提交 `8a0405e`

## 1. 本轮结论

**Cornie 0.1.0 已可在 Windows 上安装、启动、写入数据、重启读回，并完成本地 Demo 路线。**

| 编号 | 变化 | 位置 | 类型 | 状态 | 对读者的影响 |
|---|---|---|---|---|---|
| P5-1 | 打包补入 `shared` 运行时依赖 | `package.json` | 修复 | 已完成 | 安装包不再因缺少日期模块而启动失败 |
| P5-2 | API 启动握手与来源策略收口 | `electron/main.js`、`electron/server.js`、`src/renderer/App.vue` | 改变 | 已完成 | 页面等 API 就绪后才进入业务界面 |
| P5-3 | API key 接入 Electron `safeStorage` | `electron/backend/settings/service.js` | 改变 | 已完成 | SQLite 不保存原始 key，设置接口仍只返回掩码 |
| P5-4 | SQLite 与 Memory Wiki 写入原子化 | `electron/db.js`、`electron/backend/persistence/` | 修复 | 已完成 | 写入中断时保留上一份可读快照 |
| P5-5 | Demo memory 支持 reset 与目录隔离 | `scripts/load-demo-memory.mjs` | 新增 | 已完成 | Demo 可重复载入，不删除真实用户页面 |
| P5-6 | NSIS 安装、覆盖安装、卸载保留数据 | `package.json`、`scripts/verify-phase5-installer-lifecycle.mjs` | 改变 | 已完成 | 安装目录与 userData 分离，覆盖安装不丢库 |
| P5-7 | 发布 smoke 与证据脚本 | `scripts/verify-phase5-release.mjs` | 新增 | 已完成 | 八模块、记忆纠正和重启恢复可重复检查 |

常规项：7 份 Phase 5 任务简报、原子写入测试、设置测试 fake 和现有回归测试已随提交归档。

## 2. 这意味着什么

发布产物现在有一条可重复的本地闭环：NSIS 安装后启动 `Cornie.exe`，API 只绑定 `127.0.0.1:5174`，页面通过健康握手后才开放操作。

八模块 smoke 已覆盖聊天历史、日记、记忆、观察、收支、待办、日程和设置；Demo memory 已完成载入、追溯、归档、恢复和重启读回。

本轮证据命令包括 `npm run test:full`、`npm run dist`、`node scripts/verify-phase5-installer-lifecycle.mjs` 和 `node scripts/verify-phase5-release.mjs`。

## 3. 仍待开放

- 外部模型真实生成未纳入发布 smoke；当前证据使用不依赖网络模型的本地业务请求，模型供应商连通性仍取决于用户配置。
- Windows 代码签名、自动更新和线上发布渠道仍未接入；安装器可运行，但系统可能显示未签名提示。
- 本轮归档的是命令和 API 证据，没有把人工操作截图或视频作为发布附件。
