# task-041e 在新克隆上复跑完整门禁

## 1. Where this task sits

- **Phase 1 门禁说的是真话**，目标是在一台新克隆的 Windows 机器上，`npm run test:full` 从头到尾通过。
- **本任务推进 R-1 `npm run test:fast` 和 `npm run test:full` 在 Windows 检出上转绿**：用一次全新的克隆证明阶段目标达成，并收口记录。
- **Starts after**：task-041d 固定 Prettier 的换行设置并清理剩余差异。**Waits on it**：Phase 2 提炼只改它看得见的页面。

## 2. What the developer needs to know

**Read first**

- `doc/Cornie-041-门禁换行治理收口简报.md` — 041a 的基线和 041b～041d 的记录。
- `scripts/run-tests.mjs` — `full` 档依次执行 lint、前端测试、各层测试和两个 verify runner。
- `doc/Cornie-039-批次C施工收口简报.md` — 收口简报的现有写法（Headline、What it means、Still open）。

**Settled**

- 验证必须在新克隆上做，不能在开发用的工作区里做（`doc/Cornie-040-审计后改进计划.md` §3 Phase 1 Proof）。
- 新克隆沿用系统默认的 `core.autocrlf=true`，不得为了让门禁通过而改 Git 配置；`.gitattributes` 必须在这个配置下生效。

**Edges and seam**

- Seam：现有的 `npm run test:full`。不新增 seam。
- 只更新收口简报。

**Run**（Git Bash，在仓库根目录）

- `git status --short`（必须为空）
- `C="$TEMP/cornie-gate-clone"; rm -rf "$C"; git clone --branch "$(git branch --show-current)" "$(git rev-parse --show-toplevel)" "$C" && cd "$C" && npm ci`
- 在克隆目录内：`git config core.autocrlf; file src/renderer/main.js; npm run test:full; echo full=$?`

**Unknowns**

- `npm ci` 需要联网。若安装失败，停止并报告错误输出。
- 如果 `test:full` 在 lint 之外的任何一层失败，照实记录失败的文件和输出，停止并报告，不要在本任务内修复。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：在新克隆上跑完整门禁，确认通过，并完成收口简报。
2. 执行 Run 的第一条命令，确认输出为空。
3. 执行 Run 的第二条命令，建立新克隆并安装依赖。
4. 在克隆目录内执行 Run 的第三条命令，核对第 4 部分的全部 Case。
5. 回到原仓库，在收口简报中补齐 Headline（本阶段的改动表）、What it means（与 041a 基线的对照）和 Still open。
6. 删除克隆目录：`rm -rf "$TEMP/cornie-gate-clone"`。
7. 提交：`docs(gate): close the line ending gate phase`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 克隆内执行 `git config core.autocrlf` | `true`（确认是在默认配置下验证的） | `git config` |
| 2 | 克隆内执行 `file src/renderer/main.js` | 输出中不含 `CRLF` | `file` |
| 3 | 克隆内执行 `npm run test:full` | 退出码 0，最后一行为 `[tests:full] passed` | `scripts/run-tests.mjs` |
| 4 | 对照 041a 的基线 | lint 由失败变为通过；前端 177 个用例、后端 26 个测试文件、两个 verify runner 结果不变 | 收口简报 |

Case 1 的预期来自 2026-11-12 的实测（`C:/Program Files/Git/etc/gitconfig` 中 `core.autocrlf=true`）；Case 3 的末行文字来自 `scripts/run-tests.mjs` 的输出约定。
