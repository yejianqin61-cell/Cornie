# Cornie-041 门禁换行治理收口简报

## 1. 基线（task-041a）

在提交 `f24b993` 上，以系统默认 `core.autocrlf=true` 新克隆并 `npm ci` 后，逐层运行门禁：

| 层 | 结果 |
| --- | --- |
| `npm run lint` | 退出码 1；ESLint 0 错误 2 警告，失败发生在 Prettier 步骤 |
| Prettier 检查（`src` 与根配置文件） | 报告 104 个文件 |
| `npm run test:frontend` | 退出码 0；21 个文件、177 个用例通过 |
| `tests/*/*.test.mjs` | 26 个文件退出码全部为 0 |
| `verify-7.1-runner`、`verify-7.2-runner` | 退出码均为 0 |

结论：只有 lint 一层失败，原因是换行（CRLF 检出对 Prettier 的 LF 要求）。

## 2. 换行约定（task-041b）

新增仓库根目录 `.gitattributes`：

```text
* text=auto eol=lf
*.png binary
*.jpg binary
*.ico binary
```

核对：`src/renderer/main.js` 为 `text: auto`、`eol: lf`；`public/pic/Avatar.png` 为 `text: unset`（`eol: lf` 对非文本文件不生效）。新增前索引中 990 个文本文件全部为 `i/lf`，新增文件后 `git status` 只列出 `.gitattributes`，已有文件内容无变化。

## 3. 重规范化（task-041c）

`git add --renormalize .` 后 `git status --short` 为空，重规范化没有任何内容改动。随后执行 `git rm -r --cached -q . && git reset --hard HEAD` 刷新工作区：工作区文本文件 991 个全部为 `w/lf`，不再出现 `w/crlf`；`file src/renderer/main.js` 不含 CRLF；刷新后 `git status --short` 为空。

## 4. Prettier（task-041d）

`.prettierrc.json` 新增 `"endOfLine": "lf"`，与 Prettier 3 的默认值一致，仅让约定在配置中可见。`npm run lint` 退出码 0（Prettier 步骤输出 "All matched files use Prettier code style!"，ESLint 仍为 0 错误 2 警告）；`npm run test:fast` 退出码 0，末行 `[tests:fast] passed`。无需格式化任何源码。

## 5. 收口（task-041e）

### 5.1 Headline

**本期：Phase 1 全部完成；新克隆上 `npm run test:full` 一次通过。**

| # | Change | Where | Kind | State | What it means for the reader |
| --- | --- | --- | --- | --- | --- |
| E-1 | 记录门禁基线 | 本文第 1 节 | New | Done | 确认只有 lint 一层因换行失败 |
| E-2 | 新增 `.gitattributes`，文本文件固定为 LF | 仓库根目录 | New | Done | 任何机器上检出结果都与 Prettier 一致 |
| E-3 | 重规范化核对 | 本文第 3 节 | Verified | Done | 已有文件内容零改动，无需全仓大 diff |
| E-4 | Prettier 显式 `endOfLine: lf` | `.prettierrc.json` | Fixed | Done | 约定在配置中可见；lint 与 `test:fast` 转绿 |

### 5.2 What it means

在提交 `647bad9` 的新克隆上（`core.autocrlf=true`，系统默认，未改任何 Git 配置）：`file src/renderer/main.js` 不含 CRLF，`npm run test:full` 退出码 0，末行 `[tests:full] passed`。与基线对照：lint 由失败转为通过；前端 177 个用例、后端 26 个测试文件、两个 verify runner 结果不变。实际只需 `.gitattributes` 一处改动即修复根因，没有格式化任何源码。

### 5.3 Still open

- 本阶段只在 Windows 上验证；未接入 CI。
- ESLint 仍有 2 条"未使用的 eslint-disable"警告，不影响退出码，未处理。
- Phase 2 起的需求（R-2 至 R-20）尚未开始。
