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
