# task-041b 加入仓库级换行约定

## 1. Where this task sits

- **Phase 1 门禁说的是真话**，目标是在一台新克隆的 Windows 机器上，`npm run test:full` 从头到尾通过。
- **本任务推进 R-1 `npm run test:fast` 和 `npm run test:full` 在 Windows 检出上转绿**：让所有文本文件在任何机器上都检出为 LF，与 Prettier 的要求一致。
- **Starts after**：task-041a 记录门禁基线。**Waits on it**：task-041c 刷新工作区并核对重规范化。

## 2. What the developer needs to know

**Read first**

- `doc/Cornie-041-门禁换行治理收口简报.md` 的"基线"一节 — 041a 记下的失败点。
- `.gitignore` — 了解哪些文件不受版本控制，不需要考虑它们的换行。
- `git ls-files --eol` 的输出 — 每个已跟踪文件在索引（`i/`）和工作区（`w/`）中的换行。

**Settled**

- 方案为"仓库级换行约定，工作区固定为 LF"（`doc/Cornie-040-审计后改进计划.md` §2.1 R-1），不改用 Prettier 的 `endOfLine: auto`。
- `.gitattributes` 的内容固定为以下四行，不增不减：
  `* text=auto eol=lf`、`*.png binary`、`*.jpg binary`、`*.ico binary`
- 本任务只新增 `.gitattributes`，不刷新工作区、不改其他文件；刷新留给 task-041c。

**Edges and seam**

- Seam：`git check-attr` 与 `git ls-files --eol`。不新增 seam。
- 只新增仓库根目录的 `.gitattributes`。

**Run**

- `git check-attr text eol -- src/renderer/main.js public/pic/Avatar.png`
- `git ls-files --eol | awk '{print $1}' | sort | uniq -c`

**Unknowns**

- 如果 `git status` 在新增 `.gitattributes` 后报告其他文件被修改，说明索引里存在非 LF 的文本文件，与 2026-11-12 的实测不符。停止并报告这些文件，不要提交它们。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：新增固定内容的 `.gitattributes`，让文本文件检出为 LF。
2. 执行 Run 的第二条命令，确认索引侧与第 4 部分 Case 4 一致。
3. 在仓库根目录新建 `.gitattributes`，写入 Settled 中的四行，文件本身用 LF 换行。
4. 执行 Run 的第一条命令，核对 Case 1、Case 2。
5. 执行 `git status --short`，核对 Case 3。
6. 在收口简报中追加"换行约定"一节，写入 `.gitattributes` 内容与 Case 1～3 的输出。
7. 提交：`chore(repo): pin text files to lf line endings`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `git check-attr text eol -- src/renderer/main.js` | `text: auto`，`eol: lf` | `git check-attr` |
| 2 | `git check-attr text eol -- public/pic/Avatar.png` | `text: unset`（binary 宏展开的结果）；同时显示的 `eol: lf` 对非文本文件不生效，可忽略 | `git check-attr` |
| 3 | 新增文件后执行 `git status --short` | 只列出 `.gitattributes`（以及收口简报） | `git status` |
| 4 | 新增前执行 Run 的第二条命令 | 980 个 `i/lf`、30 个 `i/-text`、1 个 `i/none`（加上本阶段新增的文件） | `git ls-files --eol` |

Case 4 的数值来自 2026-11-12 在提交 `513074b` 上的实测：索引中的文本文件已经全部是 LF，所以本任务不应改变任何已有文件的内容。
