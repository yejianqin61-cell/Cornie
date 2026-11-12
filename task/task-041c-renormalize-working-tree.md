# task-041c 刷新工作区并核对重规范化

## 1. Where this task sits

- **Phase 1 门禁说的是真话**，目标是在一台新克隆的 Windows 机器上，`npm run test:full` 从头到尾通过。
- **本任务推进 R-1 `npm run test:fast` 和 `npm run test:full` 在 Windows 检出上转绿**：让现有工作区按新约定重新检出为 LF，并证明重规范化不改动任何文件内容。
- **Starts after**：task-041b 加入仓库级换行约定。**Waits on it**：task-041d 固定 Prettier 的换行设置并清理剩余差异。

## 2. What the developer needs to know

**Read first**

- `.gitattributes` — 041b 写入的四行约定。
- `doc/Cornie-041-门禁换行治理收口简报.md` — 前两个任务的记录，本任务往里追加。
- `git ls-files --eol` 的输出 — 刷新前后对照。

**Settled**

- 计划把"全仓换行重规范化"单独提交（`doc/Cornie-040-审计后改进计划.md` §2.1 R-1，Hard part）。2026-11-12 实测索引已全部是 LF，所以预期重规范化产生零内容改动；本任务的提交只更新收口简报。
- 刷新工作区的方式固定为：先确认工作区干净，再执行 `git rm -r --cached -q .` 和 `git reset --hard HEAD`。

**Edges and seam**

- Seam：`git add --renormalize`、`git ls-files --eol`、`file`。不新增 seam。
- 不改动任何源码；只追加收口简报。

**Run**

- `git status --short`（必须为空才能继续）
- `git add --renormalize . && git status --short`
- `git rm -r --cached -q . && git reset --hard HEAD`
- `git ls-files --eol | awk '{print $2}' | sort | uniq -c`、`file src/renderer/main.js`

**Unknowns**

- 第一条命令输出不为空时，停止并报告，不要执行后面的命令。`git reset --hard` 会丢掉未提交的改动。
- 如果 `git add --renormalize .` 后 `git status` 列出了任何文件，说明有文件内容会改变，与预期不符。停止，把文件列表报告上来，不要提交。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：重新检出工作区为 LF，并证明重规范化不改内容。
2. 执行 Run 的第一条命令，确认输出为空。
3. 执行 Run 的第二条命令，核对 Case 1。
4. 执行 Run 的第三条命令，刷新工作区。
5. 执行 Run 的第四条命令，核对 Case 2～4。
6. 在收口简报中追加"重规范化"一节，写入 Case 1～4 的输出。
7. 提交：`docs(gate): record empty line ending renormalization`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `git add --renormalize .` 后执行 `git status --short` | 输出为空 | `git add --renormalize` |
| 2 | 刷新后统计 `git ls-files --eol` 的工作区列 | 不再出现 `w/crlf`；文本文件都是 `w/lf` | `git ls-files --eol` |
| 3 | 刷新后执行 `file src/renderer/main.js` | 输出中不含 `CRLF` | `file` |
| 4 | 刷新后执行 `git status --short` | 输出为空 | `git status` |

Case 1 的预期来自 2026-11-12 的实测：索引中 980 个文本文件全部是 `i/lf`，重规范化无内容可改。
