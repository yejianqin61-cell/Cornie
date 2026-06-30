# 398-观察日志归档读取边界与Prompt装载治理收口

## 1. 任务目标

根据 `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md` 与 `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`，把观察日志的“按天归档、默认轻注入、历史按需补查、避免重复写入”边界彻底收口。

## 2. 任务来源

- `Cornie-0630-Identity记忆实体模型与页面结构设计.md` 第 12、13 节
- `Cornie-0630-记忆层改进治理总纲-第一版.md` 第 11 节

## 3. 目标设计

- 固化今日观察日志默认装载条数
- 固化历史观察日志默认不整包注入
- 优化同日重复事实去重与增量调整
- 补工具或 service 验证，证明 prompt 构建与 recall 分层符合设计稿

## 4. 完成标准

- 观察日志不再表现为“流水账全量塞 prompt”
- 观察日志与 Identity / 聊天记录职责清晰分层

## 5. 提交建议

`refactor(observation): enforce archive and prompt loading boundaries`
