# task-046g 安装包实机走查与收口

## 1. Where this task sits

- **Phase 6 不打开主窗口也照顾得到主人**，目标是主窗口关着时精灵会按时提醒，第二天打开就有铃湾写好的日记，主人能一键导出全部本地数据。
- **本任务推进 R-17、R-18、R-19、R-20**：打包后验证应用能正常启动，把主进程接线里能自动验证的部分验证掉，其余写成实机复验步骤，并写收口简报。
- **Starts after**：task-046a 至 046f 全部完成。**Waits on**：无，这是计划的最后一个阶段。

## 2. What the developer needs to know

**Read first**

- `scripts/verify-phase5-packaged-start.mjs` — 用 `release/win-unpacked/Cornie.exe` 启动、等 `/api/health`、写入再读回的现有打包验证。
- `scripts/verify-phase5-installer-lifecycle.mjs`、`scripts/verify-phase5-release.mjs` — 现有的安装与发布验证。
- `doc/Cornie-035-Phase5-安装包分发收口简报.md` — 上一轮安装包验证的结论与限制。
- `doc/Cornie-040-审计后改进计划.md` §3 Phase 6 的 Proof — 本阶段的验收。
- `doc/Cornie-045-后端能力接入界面收口简报.md` — 收口简报的写法，以及"没有实机验证"该怎么如实记录。

**Settled**

- 打包命令固定为 `npm run pack`（只生成 `release/win-unpacked`，不生成安装器）；然后运行 `node scripts/verify-phase5-packaged-start.mjs`，确认带着新主进程接线（提醒调度、自动日记）的应用能启动并通过现有读写读回检查。
- 提醒的弹出、精灵气泡、系统通知、设置页的保存对话框、自动日记的实际生成，都需要图形界面和（对日记）真实模型密钥，本任务**无法自动验证**。收口简报必须把这些列为"未经实机验证"，并给出具体的复验步骤（见 Case 4）。
- 本任务不改业务代码；失败时按 Unknowns 处理。
- 新收口简报为 `doc/Cornie-046-后台照顾与数据导出收口简报.md`，结构沿用 045（Headline、What it means、Still open）。
- 产品决策来源要写进简报：提醒提前 30 分钟、错过的全部补发（超过 3 条合并为一条）、自动日记默认关闭；以及两个由实施者定的默认值（回溯 7 天、每次最多 3 篇）。

**Edges and seam**

- Seam：现有的 `npm run test:full` 与打包验证脚本。不新增 seam。
- 只新增收口简报。

**Run**

- `npm run test:full`
- `npm run pack`
- `node scripts/verify-phase5-packaged-start.mjs`
- `npm run lint`

**Unknowns**

- `npm run pack` 需要下载 Electron 与 electron-builder 的二进制，可能很慢或因网络失败；失败时停止并报告错误输出，不要跳过打包验证后宣称通过。
- 如果打包版启动后 `/api/health` 不通，说明新增的主进程接线有问题；停止并报告日志，不要回退 046c、046d 的改动。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：确认打包后的应用带着新接线能启动，把自动验证不了的部分诚实地写成复验步骤。
2. 运行 `npm run test:full`，确认通过。
3. 运行 `npm run pack`，再运行 `node scripts/verify-phase5-packaged-start.mjs`。
4. 写 `doc/Cornie-046-后台照顾与数据导出收口简报.md`：Headline 列出 R-17 至 R-20 的结果；What it means 逐条对照 `doc/Cornie-040-审计后改进计划.md` 的验收项；Still open 列出所有未验证与已知限制。
5. 提交：`docs(desktop): close the background care and data export phase`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `npm run test:full` | 退出码 0，末行 `[tests:full] passed` | `scripts/run-tests.mjs` |
| 2 | `npm run pack` 后运行打包验证脚本 | 退出码 0，输出含该脚本现有的通过信息 | `verify-phase5-packaged-start.mjs` |
| 3 | 收口简报 | R-17 至 R-20 每条验收项都有结果；每个"未经实机验证"项都标注 | 收口简报 |
| 4 | 收口简报里的复验步骤 | 至少包含：创建 10 分钟后开始的日程并关闭主窗口，确认 20 分钟后精灵与系统通知出现；关闭应用、等错过时间后重新打开，确认补发；在设置里开启自动日记，确认次日生成；设置页导出并用解压工具检查包内容与不含密钥 | 收口简报 |

末行文字来自 `scripts/run-tests.mjs` 的输出约定；Case 3、4 是文档完整性检查，没有可计算的预期值。
