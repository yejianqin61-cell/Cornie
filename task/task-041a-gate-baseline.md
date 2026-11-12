# task-041a 在新克隆上记录门禁基线

## 1. Where this task sits

- **Phase 1 门禁说的是真话**，目标是在一台新克隆的 Windows 机器上，`npm run test:full` 从头到尾通过。
- **本任务推进 R-1 `npm run test:fast` 和 `npm run test:full` 在 Windows 检出上转绿**：先把失败点逐层记下来，作为后续任务的对照基线。
- **Starts after**：无。**Waits on it**：task-041b 加入仓库级换行约定。

## 2. What the developer needs to know

**Read first**

- `scripts/run-tests.mjs` — 门禁按什么顺序跑哪些层，lint 失败时为什么后面的层不会执行。
- `package.json` 的 `lint`、`test:frontend` 两个脚本 — lint 实际检查哪些目录。
- `.prettierignore` — Prettier 实际跳过哪些目录（`electron`、`scripts`、`tests/` 都被忽略）。
- `doc/Cornie-040-审计后改进计划.md` §2.1 与 §3 Phase 1 — 本阶段的验收项。

**Settled**

- 根因已初步定位（`doc/Cornie-040-审计后改进计划.md` §1.1）：Git for Windows 的系统配置 `C:/Program Files/Git/etc/gitconfig` 设了 `core.autocrlf=true`，检出为 CRLF，Prettier 默认要求 LF；仓库没有 `.gitattributes`。
- 本任务只记录现状，不修改任何源码或配置。
- 记录文件为 `doc/Cornie-041-门禁换行治理收口简报.md`，本阶段后续任务都往这一份里追加。

**Edges and seam**

- Seam：现有的 `npm run lint`、`npm run test:frontend` 和 `tests/` 下各层测试文件。不新增 seam。
- 只新增上面那份记录文件。

**Run**（Git Bash，在仓库根目录）

- `C="$TEMP/cornie-gate-clone"; rm -rf "$C"; git clone --branch "$(git branch --show-current)" "$(git rev-parse --show-toplevel)" "$C" && cd "$C" && npm ci`
- 在克隆目录内：`npm run lint; echo lint=$?`、`npm run test:frontend; echo frontend=$?`、`for f in tests/*/*.test.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done`、`node scripts/verify-7.1-runner.mjs; echo v71=$?`、`node scripts/verify-7.2-runner.mjs; echo v72=$?`

**Unknowns**

- `npm ci` 需要联网并下载 Electron 二进制。若安装失败，停止并报告错误输出，不要换用 `npm install`。
- 如果失败点超出下表 Expected 列（例如后端测试失败），照实记录并停止，不要尝试修复。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：在新克隆上逐层跑门禁并记录每处失败，不改代码。
2. 先提交或确认工作区干净（`git status --short` 输出为空），因为克隆只能拿到已提交的内容。
3. 按 Run 的第一条命令建立新克隆并安装依赖。
4. 在克隆目录内逐条执行 Run 的第二条命令，保存每层的退出码。
5. 在克隆目录内执行 `npx prettier --check src eslint.config.js vite.config.js vitest.config.js 2>&1 | tail -1`，记下被报告的文件数。
6. 回到原仓库，新建 `doc/Cornie-041-门禁换行治理收口简报.md`，写入"基线"一节：克隆所用的提交号、每层退出码、Prettier 报告的文件数。
7. 对照第 4 部分逐项核对；不符则停止并报告。
8. 提交：`docs(gate): record line ending gate baseline`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 新克隆中执行 `npm run lint` | 退出码非 0，失败发生在 Prettier 步骤 | `npm run lint` |
| 2 | 第 5 步的 Prettier 检查 | 报告约 100 个文件（2026-11-12 在同一提交上实测为 100～104 个） | Prettier CLI |
| 3 | 新克隆中执行 `npm run test:frontend` | 退出码 0；21 个测试文件、177 个用例全部通过 | Vitest |
| 4 | 逐个运行 `tests/*/*.test.mjs` | 26 个文件退出码全部为 0 | 各层测试文件 |
| 5 | 两个 verify runner | 退出码都为 0 | `scripts/verify-7.x-runner.mjs` |

Expected 列的数值来自 2026-11-12 在提交 `513074b` 上的实测，不来自阅读代码。
