# 500 Phase 5 系统密钥保护

## 1. Where this task sits

- **Phase 5 安装包离开开发机也能演示**：目标是模型凭据不以明文落在用户数据目录。
- 本任务把模型 API key 的保存、读取、清除接到 Electron 系统密钥能力。
- **开始前**：任务 498 完成。**等待它**：任务 504 的发布检查。

## 2. What the developer needs to know

**Read first**

- `electron/backend/settings/service.js` — 当前模型配置写入和环境变量同步。
- `electron/db.js` — `meta` 表和应用设置持久化入口。
- `electron/main.js` — Electron 主进程可用的安全 API 边界。
- `src/renderer/api/settings.js` — 设置页面使用的响应形状。
- `tests/services/phase2-supporting-flows.test.mjs` — 现有设置保存与清除证明。

**Settled**

- renderer 不直接接触密钥和 Electron 模块。
- API 返回掩码和 `hasApiKey`，不返回原文。
- 系统能力不可用时必须明确失败，不降级到明文存储。

**Edges and seam**

- 接缝是主进程安全存储、settings service 和重启后的配置读取。
- 不更改模型供应商或设置页面视觉结构。

**Run**

- `node tests/services/phase2-supporting-flows.test.mjs`
- `npm run test:full`

**Unknowns**

- 当前运行环境若不支持 `safeStorage`，用可控 fake 验证分支；不要把测试 fake 当成 Windows 证明。

## 3. The workflow

1. 阅读第 2 部分，复述：密钥只能经主进程系统存储读写。
2. 写失败测试，证明 SQLite 或配置文件中不出现原始 key。
3. 接入安全存储编码和解码，并保留掩码响应。
4. 验证保存、读取、重启恢复和清除四个动作。
5. 在不支持系统能力时验证明确错误。
6. 运行设置服务和全量门禁并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 保存密钥 | 原始 API key | 只保存加密值 | settings service |
| 查询设置 | 已保存配置 | 返回掩码和状态 | settings route |
| 重启读取 | 新服务实例 | 模型可读取密钥 | secure store |
| 清除密钥 | DELETE 设置 | 密钥和环境变量清除 | clear path |
| 能力缺失 | safeStorage 不可用 | 明确错误且不明文降级 | main boundary |
