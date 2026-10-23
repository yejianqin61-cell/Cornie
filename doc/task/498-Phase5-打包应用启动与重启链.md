# 498 Phase 5 打包应用启动与重启链

## 1. Where this task sits

- **Phase 5 安装包离开开发机也能演示**：目标是在干净 Windows 用户环境安装后继续使用 Cornie。
- 本任务先用真实打包应用贯通启动、健康检查、业务写入、读取和重启。
- **开始前**：Phase 4 完成。**等待它**：任务 499 至 504 复用真实启动证据。

## 2. What the developer needs to know

**Read first**

- `electron/main.js` — 打包态窗口、数据库和本地 API 的启动顺序。
- `electron/main.cjs` — electron-builder 使用的 CommonJS 入口。
- `electron/server.js` — 健康端点和业务路由装配。
- `electron/db.js` — userData 数据库打开、迁移和持久化入口。
- `package.json` — `pack`、`dist` 和安装包文件范围。

**Settled**

- 打包态页面从 `dist` 加载，API 仍只监听本机地址。
- 数据库和 memory layer 使用 Electron `userData`，不依赖项目目录。
- 验证使用隔离用户目录和可控本地 API，不访问外部模型。

**Edges and seam**

- 接缝是实际 `win-unpacked` 应用、`/api/health` 和一个可落库业务请求。
- 不在本任务扩展业务模块或实现安装器 UI。

**Run**

- `npm run pack`
- `npm run build`

**Unknowns**

- 若打包应用无法在当前桌面启动，保留完整启动日志并停止，不用开发态结果替代。

## 3. The workflow

1. 阅读第 2 部分，复述：真实打包应用必须启动本地 API 并在重启后读回数据。
2. 打包应用并确认输出目录和可执行文件。
3. 在隔离 userData 下启动应用，读取健康端点。
4. 写入一条不依赖模型的业务数据并通过 API 读回。
5. 关闭应用后再次启动，验证数据库和 memory 目录仍可读取。
6. 记录启动、写入、重启和读取证据并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 打包 | `npm run pack` | 生成可执行目录 | electron-builder |
| 启动 | 干净 userData | 应用启动且 API 可达 | `main.js` |
| 健康检查 | `GET /api/health` | 返回 `ok: true` | health route |
| 业务写入 | 本地日记或收支请求 | 返回已保存记录 | domain route |
| 重启读取 | 再次启动应用 | 记录仍可读取 | `openDb()` |
