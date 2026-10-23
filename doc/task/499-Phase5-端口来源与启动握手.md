# 499 Phase 5 端口来源与启动握手

## 1. Where this task sits

- **Phase 5 安装包离开开发机也能演示**：目标是打包页面和本地 API 在真实环境中稳定握手。
- 本任务根据任务 498 的真实失败修正端口、来源策略和启动就绪语义。
- **开始前**：任务 498 完成。**等待它**：任务 503 的覆盖安装和端口冲突验证。

## 2. What the developer needs to know

**Read first**

- `electron/main.js` — API 监听、窗口加载和启动时序。
- `electron/server.js` — CORS 来源和健康端点。
- `src/renderer/api/client.js` — renderer API 的服务地址。
- `src/renderer/api/api.test.js` — 客户端错误和请求契约。
- `scripts/verify-task121-electron-startup-chain.mjs` — 已有启动链约束。

**Settled**

- API 只绑定 `127.0.0.1`，不暴露局域网。
- 开发态和打包态允许不同页面来源，但 API 入口必须可探测。
- 端口冲突必须恢复或给出明确用户提示，不能静默失败。

**Edges and seam**

- 接缝是 API 监听结果、页面来源检查和启动健康握手。
- 不改 renderer API 业务字段，不引入远程服务。

**Run**

- `node scripts/verify-task121-electron-startup-chain.mjs`
- `npm run pack`

**Unknowns**

- 若固定端口与现有桌面进程冲突，先确认是否允许动态端口；未确定前停止改动。

## 3. The workflow

1. 阅读第 2 部分，复述：页面只有在 API 就绪后才能进入可操作状态。
2. 在任务 498 的启动证据中复现来源或端口失败。
3. 写失败测试，固定端口冲突和健康握手的独立结果。
4. 以最小改动补启动就绪信号或明确错误路径。
5. 在开发态和打包态分别验证页面来源与健康端点。
6. 运行启动链校验和打包命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 正常端口 | 端口空闲 | API 健康且页面可加载 | startup |
| 端口占用 | 5174 已监听 | 恢复或显示明确提示 | API listen |
| 来源检查 | 打包 `file://` 页面 | 请求不被错误 CORS 拦截 | CORS middleware |
| 未就绪页面 | API 尚未启动 | 页面不静默失败 | startup handshake |
| 回环限制 | 外部地址请求 | 服务不接受远程绑定 | bind address |
