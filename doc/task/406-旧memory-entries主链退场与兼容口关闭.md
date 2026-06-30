# 406-旧 memory entries主链退场与兼容口关闭

## 1. 任务目标

根据 `0630` 总纲，把旧 `memory_entries` 从长期记忆主链中正式退场，确保 Memory Wiki 成为唯一正式跨天记忆主源。

---

## 2. 任务来源

- `Cornie-0630-记忆层改进治理总纲-第一版.md` 第 2、7、8、9、10、13 节

---

## 3. 目标设计

### 3.1 主源唯一化

要求：

- 对话后的长期记忆正式写入以 Memory Wiki 为主
- 主链 prompt 不再依赖旧 `memory_entries` 摘要

### 3.2 兼容口处理

如果代码里还存在旧链路：

- 明确降级为兼容层
- 明确不再参与正式主链读回
- 清理多余工具与入口

### 3.3 风险控制

退场过程要避免：

- 双写双读
- 新旧记忆摘要冲突
- 同一事实两套长期记忆同时存在

---

## 4. 实施点

- `electron/backend/agent/contextBuilder.js`
- `electron/backend/agent/orchestrator.js`
- `electron/backend/memory/*`
- `electron/backend/tools/*`

---

## 5. 完成标准

- Memory Wiki 成为唯一正式长期记忆主源
- 旧 memory 不再参与主链注入
- 遗留工具 / 兼容入口被清理或标记为退场
- 有专项脚本证明不存在主链双读

---

## 6. 提交建议

`refactor(memory): retire legacy memory entries from primary chain`
