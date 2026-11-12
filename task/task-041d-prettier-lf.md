# task-041d 固定 Prettier 换行并清理剩余差异

## 1. Where this task sits

- **Phase 1 门禁说的是真话**，目标是在一台新克隆的 Windows 机器上，`npm run test:full` 从头到尾通过。
- **本任务推进 R-1 `npm run test:fast` 和 `npm run test:full` 在 Windows 检出上转绿**：在 Prettier 配置里显式写明 LF，并让 `npm run lint` 在当前工作区通过。
- **Starts after**：task-041c 刷新工作区并核对重规范化。**Waits on it**：task-041e 在新克隆上复跑完整门禁。

## 2. What the developer needs to know

**Read first**

- `.prettierrc.json` — 现有五项设置，没有写 `endOfLine`。
- `.prettierignore` — Prettier 实际检查的范围（`electron`、`scripts`、`tests/`、`*.md` 都被忽略）。
- `package.json` 的 `lint` 脚本 — ESLint、Prettier、Stylelint 三步的确切参数。
- `doc/Cornie-041-门禁换行治理收口简报.md` — 前三个任务的记录。

**Settled**

- 在 `.prettierrc.json` 中新增 `"endOfLine": "lf"`，其余设置不动。它与 Prettier 3 的默认值相同，写出来是为了让约定在配置里可见（`doc/Cornie-040-审计后改进计划.md` §2.1 R-1）。
- 不修改 `.prettierignore` 的范围，不修 ESLint 现有的两条"未使用的 eslint-disable"警告（它们不是错误，不影响退出码）。
- 2026-11-12 实测：把提交 `513074b` 以 LF 导出后，`npm run lint` 中的 Prettier 步骤报告"All matched files use Prettier code style"。所以预期本任务不需要格式化任何源码。

**Edges and seam**

- Seam：现有的 `npm run lint`。不新增 seam。
- 只改 `.prettierrc.json`，并追加收口简报。

**Run**

- `npm run lint; echo lint=$?`
- 仅当上一条报告了 Prettier 文件时：`npx prettier --write <被报告的文件>`

**Unknowns**

- 如果 `npm run lint` 报告的 Prettier 文件超过 5 个，说明换行之外还有格式问题，或者 041c 没有刷新成功。停止并报告文件列表，不要批量 `--write`。
- 如果 ESLint 或 Stylelint 步骤报告错误（不是警告），停止并报告，不在本任务内修复。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：显式把 Prettier 换行设为 LF，并让 lint 通过。
2. 在 `.prettierrc.json` 中新增 `"endOfLine": "lf"`。
3. 执行 Run 的第一条命令，核对 Case 1、Case 2。
4. 如有被报告的文件（不超过 5 个），逐个 `--write`，再执行 Run 的第一条命令。
5. 执行 `npm run test:fast; echo fast=$?`，核对 Case 3。
6. 在收口简报中追加"Prettier"一节，写入改动和 Case 1～3 的结果。
7. 提交：`chore(lint): pin prettier line endings to lf`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `npm run lint` 的 Prettier 步骤 | 输出 "All matched files use Prettier code style" | `npm run lint` |
| 2 | `npm run lint` 的退出码 | 0；ESLint 仍报 2 条警告、0 条错误 | `npm run lint` |
| 3 | `npm run test:fast` | 退出码 0，最后一行为 `[tests:fast] passed` | `scripts/run-tests.mjs` |

Case 1、2 的预期来自 2026-11-12 对 LF 导出的实测；Case 3 的末行文字来自 `scripts/run-tests.mjs` 的输出约定。
