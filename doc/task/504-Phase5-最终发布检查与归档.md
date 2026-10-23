# 504 Phase 5 最终发布检查与归档

## 1. Where this task sits

- **Phase 5 安装包离开开发机也能演示**：目标是固定一条可重复的安装包 Demo 路线并归档证据。
- 本任务串起前六项成果，形成八模块、记忆演示和重启恢复的最终发布检查。
- **开始前**：任务 498 至 503 完成。**完成后**：Phase 5 可以收口。

## 2. What the developer needs to know

**Read first**

- `doc/Cornie-031-Phase3-记忆Demo演示脚本.md` — 记住、想起、追溯和纠正步骤。
- `doc/Cornie-028-产品Demo改进施工计划.md` — 八模块和 Phase 5 证明范围。
- `package.json` — 构建、打包和测试入口。
- `scripts/load-demo-memory.mjs` — Demo 数据入口。
- `doc/Cornie-034-Phase4-工程规则收口简报.md` — 唯一全量门禁基线。

**Settled**

- 发布检查只记录真实安装包行为，不用开发态日志替代。
- 演示路线覆盖聊天、日记、记忆、观察、收支、待办、日程和设置。
- 记录包版本、环境、命令、可见结果和未完成项。

**Edges and seam**

- 接缝是安装包启动、Demo 数据载入、八模块操作、记忆演示和重启恢复。
- 不扩展到云同步、签名、自动更新或线上发布。

**Run**

- `npm run test:full`
- `npm run dist`

**Unknowns**

- 若任何模块只能通过开发目录或外部 API 工作，发布检查停在该步骤并保留证据。

## 3. The workflow

1. 阅读第 2 部分，复述：安装包必须按固定路线完成八模块和记忆演示。
2. 记录安装包版本、系统环境和干净 userData 状态。
3. 安装、启动、载入 Demo 数据并按路线操作八个模块。
4. 完成“记住—想起—追溯—纠正”并记录界面证据。
5. 重启应用，读取业务数据、记忆页面和设置状态。
6. 汇总成功、失败和未验证步骤，生成 Phase 5 收口简报并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 八模块 | 固定工作日路线 | 八个入口都有有效内容 | installed app |
| 记忆演示 | Demo memory set | 写入、召回、追溯、纠正可见 | memory UI |
| 设置 | 模型配置 | 掩码状态可保存和清除 | settings |
| 重启 | 关闭后再次启动 | 数据和状态保持 | userData |
| 归档 | 检查清单与日志 | 结果可复查 | release report |
