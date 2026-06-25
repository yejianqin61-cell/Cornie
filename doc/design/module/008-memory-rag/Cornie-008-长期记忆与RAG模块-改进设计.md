# Cornie 008 长期记忆与RAG模块改进设计

## 1. 模块目标

负责长期记忆的写入、检索、归档、压缩，以及后续 RAG 演进。

## 2. 模块范围

- 长期记忆写入
- 长期记忆检索
- 长期记忆归档
- 长期记忆压缩
- 轻量 RAG

## 3. MVP 方案

- 结构化记忆表
- 标签/关键词检索
- 权重排序
- 活跃 / 低频 / 归档 三层机制

## 4. 后续演进

- V1 引入轻量语义检索
- V2 引入完整 RAG

## 5. 主要工具

- `memory.create`
- `memory.update`
- `memory.delete`
- `memory.list_active`
- `memory.search`

---

**文档结束**
