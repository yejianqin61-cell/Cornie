# 440 memory wiki frontmatter多行字段安全序列化与异常隔离修复

## 背景

当前长期记忆 wiki 支持普通用户从前端手动新建和编辑页面，但 `summary` 等 frontmatter 标量字段一旦包含换行，后端会直接按多行文本写入 `.md` frontmatter，导致页面文件结构损坏。随后：

1. 该页面自身无法再次打开。
2. 记忆页列表摘要读取会报错。
3. 聊天上下文构建在读取长期记忆摘要时会被坏页连带影响。

这会形成“新建一页记忆失败，聊天也一起异常”的连锁问题。

## 目标

1. 修复 memory wiki frontmatter 对多行标量字段的写入策略。
2. 保留普通用户在前端填写多行摘要/描述的能力，不强制阉割输入。
3. 修复当前已知坏页，确保记忆列表和聊天链路恢复稳定。
4. 保证单页坏数据不会再拖垮记忆列表和聊天主链。

## 范围

- `electron/backend/memory-wiki/storage.js`
- `electron/backend/memory-wiki/service.js`
- `electron/backend/agent/wikiContext.js`
- `data/memory-wiki/pages/identity/people/*.md`

本任务不扩展 UI 视觉，不改普通用户的信息架构。

## 设计要求

### 1. frontmatter 标量字段安全序列化

对 `summary`、`identity_summary`、`role_summary`、`timeline_summary` 等所有标量字段统一采用“单行安全落盘”策略：

1. 先转成字符串。
2. 将真实反斜杠转义为 `\\`。
3. 将真实换行转义为 `\n`。
4. frontmatter 中始终写成单行 `key: value`。

这样可以兼容当前简化版 frontmatter 解析器，不引入 YAML block scalar 复杂度。

### 2. 读取时还原换行

frontmatter 解析时，对标量值执行反向还原：

1. `\\n` 还原为真实换行。
2. `\\\\` 还原为真实反斜杠。

保证前端再次打开记忆页时，用户仍能看到原始的多行文本。

### 3. 历史坏页修复

至少修复当前已知坏页：

1. `identity/people/刘春花.md`
2. `identity/people/钟奕菲.md`

修复标准：

1. frontmatter 合法闭合。
2. `summary` 变回单字段文本。
3. `body` 保持原语义不丢失。

### 4. 异常隔离

保留并确认以下隔离策略有效：

1. 单页 hydration 失败时，记忆页列表仍能展示其余页面。
2. 长期记忆上下文整体读取失败时，聊天仍能继续，只是降级为“不注入记忆页内容”。

## 实施步骤

1. 在 `storage.js` 中新增 frontmatter 标量转义/反转义工具函数。
2. 修改 `serializeMetadata()`，统一走安全单行序列化。
3. 修改 `parseScalarValue()`，恢复换行和反斜杠。
4. 修复 `钟奕菲.md` 现有坏页。
5. 复核 `刘春花.md` 是否仍符合新规则。
6. 进行最小验证：
   - 解析坏页不再报错。
   - 创建含多行 `summary` 的页面后可再次读取。
   - 记忆摘要列表和聊天入口不再被拖垮。

## 验收标准

1. 从普通用户长期记忆入口手动创建一页，`summary` 填入多行文本，保存成功。
2. 新创建页面可以再次打开，内容不丢失。
3. 记忆列表可正常展示，不因单页异常整体白屏或报错。
4. 聊天主链即使遇到坏页，也不会整体失败。
5. 控制台不再持续出现 `invalid memory wiki frontmatter line` 同类报错。

## 风险与注意事项

1. 该任务会触碰真实运行态记忆数据，修改时不能批量覆盖其他页面。
2. 旧页面可能还存在未被发现的同类坏数据，因此异常隔离必须保留。
3. 若后续要升级为完整 YAML/frontmatter 方案，应另开任务，不在本任务内扩展。
