# 481 Phase 2 日记观察设置复验

## 1. Where this task sits

- **Phase 2 日常业务都能真实落库**：目标是一个工作日的六类业务能保存并重载。
- 本任务落实 **R-6 复验日记、观察与设置的真实业务链**，补足写入、读取和清除证明。
- 可与任务 479 并行；跨模块演示依赖三类辅助业务已验证。

## 2. What the developer needs to know

**Read first**

- `electron/backend/diary/routes.js` — 日记写入和读取的真实端点。
- `electron/backend/observation/routes.js` — 观察创建、读取和删除边界。
- `electron/backend/settings/routes.js` — 模型设置保存、读取和清除端点。
- `src/renderer/api/diary.js` — 日记 API 是否保留领域字段。
- `src/renderer/api/observation.js` 与 `settings.js` — 三类前端调用入口。

**Settled**

- 日记以日期覆盖写入后读回。
- 观察以 ID 创建、读回并删除。
- 设置保存后读回，清除后不得返回旧密钥值。

**Edges and seam**

- 接缝是真实 HTTP 路由到各自前端 API。
- 不调用真实模型，也不展示或记录明文 API Key。

**Run**

- `node tests/services/phase2-supporting-flows.test.mjs`
- `npx vitest run src/renderer/components/{diary,observe,settings} --maxWorkers=1`
- `npm run test:full`。

**Unknowns**

- 若设置清除采用掩码返回，测试以“旧值不可读”为准。
- 若观察删除无返回体，测试以后续读取 404 为准。

## 3. The workflow

1. 阅读第 2 部分，复述：用真实 HTTP 证明日记、观察和设置可保存并回读。
2. 为日记写入重载写失败测试。
3. 为观察创建、读取和删除写失败测试。
4. 为设置保存、读取和清除写失败测试。
5. 运行三个命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 日记保存 | 日期和正文 | 重载得到正文 | `/entries/:date` |
| 观察删除 | 新观察 ID | 后续读取 404 | `/observations/:id` |
| 设置保存 | 测试模型值 | 读取同一非敏感值 | `/settings/model` |
| 设置清除 | 已保存设置 | 旧值不可读 | 设置路由 |
| 无效观察 | 缺标题 | 返回 400 | 观察路由 |
