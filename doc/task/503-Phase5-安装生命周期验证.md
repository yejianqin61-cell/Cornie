# 503 Phase 5 安装生命周期验证

## 1. Where this task sits

- **Phase 5 安装包离开开发机也能演示**：目标是干净 Windows 环境完成安装、首次启动、覆盖安装和卸载选择。
- 本任务验证 electron-builder 产物的安装生命周期，不把开发目录启动当成安装证明。
- **开始前**：任务 498、499 完成。**等待它**：任务 504 的发布检查归档。

## 2. What the developer needs to know

**Read first**

- `package.json` — NSIS 配置、产品名和输出目录。
- `electron/main.js` — 安装后 userData 和 dist 加载路径。
- `doc/Cornie-028-产品Demo改进施工计划.md` — Phase 5 的安装验收范围。
- `scripts/check-repo-cleanliness.mjs` — 产物和临时文件检查方式。
- `doc/Cornie-031-Phase3-记忆Demo演示脚本.md` — 安装后要复现的演示入口。

**Settled**

- 只验证 Windows NSIS，暂不做代码签名和自动更新。
- 用户数据与安装目录分离，卸载是否保留数据必须明确记录。
- 覆盖安装不得删除已有数据库或 memory layer。

**Edges and seam**

- 接缝是 `release` 安装器、安装目录、userData 和卸载结果。
- 不改 NSIS 视觉样式或增加第三方发布渠道。

**Run**

- `npm run dist`
- `npm run pack`

**Unknowns**

- 若当前环境无法执行安装器 UI，记录产物和手工阻塞点；不把 `win-unpacked` 等同于安装成功。

## 3. The workflow

1. 阅读第 2 部分，复述：安装生命周期必须验证安装目录和用户数据目录的分离。
2. 生成 NSIS 安装包并确认版本与架构。
3. 在干净用户目录安装并完成首次启动健康检查。
4. 写入数据后执行覆盖安装，确认数据仍在。
5. 卸载并分别记录保留数据和清理数据的结果。
6. 运行产物检查并提交生命周期证据。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 首次安装 | 干净 Windows 用户 | 安装器完成且可启动 | NSIS |
| 首次启动 | 新 userData | API 与页面可用 | installed app |
| 覆盖安装 | 已有数据库 | 数据仍可读取 | updater path |
| 卸载保留 | 用户选择保留 | userData 保留 | uninstall |
| 卸载清理 | 用户选择清理 | 安装目录和数据清理 | uninstall |
