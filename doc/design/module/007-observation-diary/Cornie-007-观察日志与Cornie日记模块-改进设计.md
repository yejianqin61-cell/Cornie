# Cornie 007 观察日志与Cornie日记模块改进设计

## 1. 模块目标

负责事实记录层与文学表达层的分离设计。

## 2. 模块范围

- 观察日志
- 人类日记
- Cornie 日记
- 定时生成
- 手动生成

## 3. 设计要点

### 3.1 观察日志

- 每轮按需记录
- 写入前先看今日观察日志摘要
- 判断是新增、补充还是不记录

### 3.2 Cornie 日记输入

- 当天观察日志
- 人类日记
- 相关长期记忆摘要

### 3.3 Cornie 日记风格

- 第一人称
- 自称铃湾或小铃湾
- 文学化、温柔、克制

## 4. 主要工具

- `observation.add_note`
- `observation.update_note`
- `observation.delete_note`
- `observation.list_today`
- `diary.generate_from_observations`
- `diary.get_entry`
- `diary.update_entry`

---

**文档结束**
