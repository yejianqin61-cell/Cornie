# 405-聊天记录与Identity Topic Observation跨源回查收口

## 1. 任务目标

把聊天记录与 Identity、Topic Index、观察日志之间的“跨源回查关系”彻底打通，形成记忆来源可追溯闭环。

---

## 2. 任务来源

- `Cornie-0630-Identity记忆实体模型与页面结构设计.md` 第 8、12、13 节
- `Cornie-0630-聊天记录存储与历史归档改造方案.md` 第 5、6 节
- `Cornie-0630-记忆层改进治理总纲-第一版.md` 第 7、10、11 节

---

## 3. 目标设计

### 3.1 人物反查聊天

从人物页 / Topic 命中后，应能反查：

- 哪些日期提到过这个人物
- 对应聊天片段是什么

### 3.2 观察日志反查聊天

观察日志已有 `messageId` / `relatedRef` 时，应能回跳到原始聊天来源。

### 3.3 Identity / Topic / Chat 三层协同

实现路径应为：

- Topic Index 命中主题
- 找到相关聊天日期、观察日志、记忆页
- 再按需补查详细聊天内容

---

## 4. 实施点

- `electron/backend/agent/wikiContext.js`
- `electron/backend/chatlog/service.js`
- `electron/backend/memory-wiki/tools.js`
- `electron/backend/observation/service.js`

---

## 5. 完成标准

- 聊天 / 观察 / Identity / Topic 之间可互相回查
- 记忆页面来源不再只有“有个引用”，而能追到实际聊天日期与片段
- 有专项脚本覆盖主题、人名、观察来源三类回查

---

## 6. 提交建议

`feat(memory-trace): complete cross-source recall across chat observation and identity`
